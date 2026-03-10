#include "widgets/DocumentPane.h"
#include "theme/Colors.h"

#include <QCoreApplication>
#include <QEvent>
#include <QGuiApplication>
#include <QDir>
#include <QElapsedTimer>
#include <QFileInfo>
#include <QHideEvent>
#include <QImage>
#include <QLabel>
#include <QPixmap>
#include <QPlainTextEdit>
#include <QPushButton>
#include <QResizeEvent>
#include <QScreen>
#include <QShowEvent>
#include <QThread>
#include <QTimer>
#include <QUrl>
#include <QVBoxLayout>
#include <QWindow>
#include <string>

#ifdef Q_OS_WIN
#include <qt_windows.h>
#include <shellapi.h>
#include <shlwapi.h>
#endif

namespace Ixplorer {

namespace {

#ifdef Q_OS_WIN

struct WindowCandidate {
    HWND hwnd = nullptr;
    int score = -1;
};

struct CandidateSearchContext {
    const QSet<quintptr> *baseline = nullptr;
    QString fileNameLower;
    QString fileBaseNameLower;
    QString expectedExecutableLower;
    DWORD launchedProcessId = 0;
    WindowCandidate *best = nullptr;
};

QSet<quintptr> snapshotTopLevelWindows() {
    QSet<quintptr> windows;
    EnumWindows(
        [](HWND hwnd, LPARAM lParam) -> BOOL {
            auto *set = reinterpret_cast<QSet<quintptr> *>(lParam);
            if (IsWindow(hwnd) && GetAncestor(hwnd, GA_ROOT) == hwnd) {
                set->insert(reinterpret_cast<quintptr>(hwnd));
            }
            return TRUE;
        },
        reinterpret_cast<LPARAM>(&windows));
    return windows;
}

QString windowTitle(HWND hwnd) {
    const int length = GetWindowTextLengthW(hwnd);
    if (length <= 0) {
        return QString();
    }

    std::wstring buffer;
    buffer.resize(static_cast<size_t>(length) + 1U);
    GetWindowTextW(hwnd, buffer.data(), length + 1);
    return QString::fromWCharArray(buffer.c_str()).trimmed();
}

QString processExecutableBaseName(DWORD processId) {
    if (processId == 0) {
        return QString();
    }

    HANDLE process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, processId);
    if (!process) {
        return QString();
    }

    std::wstring buffer;
    buffer.resize(32768);
    DWORD size = static_cast<DWORD>(buffer.size());
    QString result;
    if (QueryFullProcessImageNameW(process, 0, buffer.data(), &size)) {
        result = QFileInfo(QString::fromWCharArray(buffer.data(), size)).fileName().toLower();
    }
    CloseHandle(process);
    return result;
}

QString associatedExecutableBaseName(const QString &path) {
    const QString suffix = QFileInfo(path).suffix().trimmed().toLower();
    const QString association = suffix.isEmpty() ? QDir::toNativeSeparators(path) : QStringLiteral(".") + suffix;

    DWORD length = 0;
    AssocQueryStringW(ASSOCF_NONE,
                      ASSOCSTR_EXECUTABLE,
                      reinterpret_cast<LPCWSTR>(association.utf16()),
                      L"open",
                      nullptr,
                      &length);
    if (length == 0) {
        return QString();
    }

    std::wstring buffer;
    buffer.resize(length + 2);
    if (AssocQueryStringW(ASSOCF_NONE,
                          ASSOCSTR_EXECUTABLE,
                          reinterpret_cast<LPCWSTR>(association.utf16()),
                          L"open",
                          buffer.data(),
                          &length) != S_OK) {
        return QString();
    }

    return QFileInfo(QString::fromWCharArray(buffer.c_str())).fileName().toLower();
}

bool isTopLevelEmbeddableWindow(HWND hwnd) {
    if (!IsWindow(hwnd)) {
        return false;
    }
    if (GetAncestor(hwnd, GA_ROOT) != hwnd) {
        return false;
    }
    if (GetWindow(hwnd, GW_OWNER) != nullptr) {
        return false;
    }

    const LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    if (exStyle & WS_EX_TOOLWINDOW) {
        return false;
    }

    return true;
}

QString associatedOpenCommand(const QString &path) {
    const QString suffix = QFileInfo(path).suffix().trimmed().toLower();
    const QString association = suffix.isEmpty() ? QDir::toNativeSeparators(path) : QStringLiteral(".") + suffix;

    DWORD length = 0;
    AssocQueryStringW(ASSOCF_NONE,
                      ASSOCSTR_COMMAND,
                      reinterpret_cast<LPCWSTR>(association.utf16()),
                      L"open",
                      nullptr,
                      &length);
    if (length == 0) {
        return QString();
    }

    std::wstring buffer;
    buffer.resize(length + 2);
    if (AssocQueryStringW(ASSOCF_NONE,
                          ASSOCSTR_COMMAND,
                          reinterpret_cast<LPCWSTR>(association.utf16()),
                          L"open",
                          buffer.data(),
                          &length) != S_OK) {
        return QString();
    }

    return QString::fromWCharArray(buffer.c_str()).trimmed();
}

QString expandEnvironmentStrings(const QString &command) {
    DWORD length = ExpandEnvironmentStringsW(reinterpret_cast<LPCWSTR>(command.utf16()), nullptr, 0);
    if (length == 0) {
        return command;
    }

    std::wstring buffer;
    buffer.resize(length + 2);
    if (!ExpandEnvironmentStringsW(reinterpret_cast<LPCWSTR>(command.utf16()), buffer.data(), length + 1)) {
        return command;
    }

    return QString::fromWCharArray(buffer.c_str()).trimmed();
}

QString expandAssociationCommand(const QString &command, const QString &path) {
    if (command.isEmpty()) {
        return QString();
    }

    const QString nativePath = QDir::toNativeSeparators(path);
    const QString fileUrl = QUrl::fromLocalFile(nativePath).toString();
    QString expanded = command;
    expanded.replace(QStringLiteral("%1"), QStringLiteral("\"%1\"").arg(nativePath), Qt::CaseInsensitive);
    expanded.replace(QStringLiteral("%l"), QStringLiteral("\"%1\"").arg(nativePath), Qt::CaseInsensitive);
    expanded.replace(QStringLiteral("%L"), QStringLiteral("\"%1\"").arg(nativePath), Qt::CaseInsensitive);
    expanded.replace(QStringLiteral("%u"), QStringLiteral("\"%1\"").arg(fileUrl), Qt::CaseInsensitive);
    expanded.replace(QStringLiteral("%U"), QStringLiteral("\"%1\"").arg(fileUrl), Qt::CaseInsensitive);
    expanded.replace(QStringLiteral("%*"), QString(), Qt::CaseInsensitive);
    if (!expanded.contains(nativePath, Qt::CaseInsensitive) && !expanded.contains(fileUrl, Qt::CaseInsensitive)) {
        expanded += QStringLiteral(" \"%1\"").arg(nativePath);
    }
    return expandEnvironmentStrings(expanded);
}

WindowCandidate findBestWindowCandidate(
    const QSet<quintptr> &baseline,
    const QString &fileNameLower,
    const QString &fileBaseNameLower,
    const QString &expectedExecutableLower,
    DWORD launchedProcessId) {
    WindowCandidate best;
    CandidateSearchContext context{&baseline, fileNameLower, fileBaseNameLower, expectedExecutableLower, launchedProcessId, &best};

    EnumWindows(
        [](HWND hwnd, LPARAM lParam) -> BOOL {
            auto *context = reinterpret_cast<CandidateSearchContext *>(lParam);

            if (!isTopLevelEmbeddableWindow(hwnd)) {
                return TRUE;
            }

            DWORD pid = 0;
            GetWindowThreadProcessId(hwnd, &pid);

            const QString title = windowTitle(hwnd).toLower();
            const QString executable = processExecutableBaseName(pid);
            const bool isNew = !context->baseline->contains(reinterpret_cast<quintptr>(hwnd));
            const bool titleMatches =
                (!context->fileNameLower.isEmpty() && title.contains(context->fileNameLower)) ||
                (!context->fileBaseNameLower.isEmpty() && title.contains(context->fileBaseNameLower));
            const bool pidMatches = context->launchedProcessId != 0 && pid == context->launchedProcessId;
            const bool executableMatches =
                !context->expectedExecutableLower.isEmpty() && executable == context->expectedExecutableLower;
            const bool isVisible = IsWindowVisible(hwnd);

            if (!titleMatches && !(pidMatches && executableMatches)) {
                return TRUE;
            }
            if (!context->expectedExecutableLower.isEmpty() && !executableMatches && !pidMatches) {
                return TRUE;
            }
            if (!isVisible && !pidMatches) {
                return TRUE;
            }

            int score = 0;
            if (isNew) {
                score += 50;
            }
            if (titleMatches) {
                score += 70;
            }
            if (pidMatches) {
                score += 45;
            }
            if (executableMatches) {
                score += 25;
            }
            if (!title.isEmpty()) {
                score += 10;
            }

            if (score > context->best->score) {
                context->best->hwnd = hwnd;
                context->best->score = score;
            }

            return TRUE;
        },
        reinterpret_cast<LPARAM>(&context));

    return best;
}

bool launchAssociatedAppForPath(const QString &path, HANDLE *processHandle, DWORD *processId) {
    const QString expandedCommand = expandAssociationCommand(associatedOpenCommand(path), path);
    if (!expandedCommand.isEmpty()) {
        STARTUPINFOW startupInfo{};
        startupInfo.cb = sizeof(startupInfo);
        startupInfo.dwFlags = STARTF_USESHOWWINDOW;
        startupInfo.wShowWindow = SW_HIDE;

        PROCESS_INFORMATION processInfo{};
        std::wstring commandLine = expandedCommand.toStdWString();
        commandLine.push_back(L'\0');
        if (CreateProcessW(nullptr,
                           commandLine.data(),
                           nullptr,
                           nullptr,
                           FALSE,
                           CREATE_UNICODE_ENVIRONMENT,
                           nullptr,
                           nullptr,
                           &startupInfo,
                           &processInfo)) {
            CloseHandle(processInfo.hThread);
            if (processHandle) {
                *processHandle = processInfo.hProcess;
            }
            if (processId) {
                *processId = processInfo.dwProcessId;
            }
            return true;
        }
    }

    SHELLEXECUTEINFOW info{};
    info.cbSize = sizeof(info);
    info.fMask = SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC | SEE_MASK_FLAG_NO_UI;
    info.lpVerb = L"open";
    const QString nativePath = QDir::toNativeSeparators(path);
    info.lpFile = reinterpret_cast<LPCWSTR>(nativePath.utf16());
    info.nShow = SW_HIDE;

    if (!ShellExecuteExW(&info)) {
        return false;
    }

    if (processHandle) {
        *processHandle = info.hProcess;
    }
    if (processId) {
        *processId = info.hProcess ? GetProcessId(info.hProcess) : 0;
    }
    return true;
}

bool closeHostedWindow(WId windowId, quintptr processHandle) {
    if (windowId != 0 && IsWindow(reinterpret_cast<HWND>(windowId))) {
        PostMessageW(reinterpret_cast<HWND>(windowId), WM_CLOSE, 0, 0);
    }

    if (processHandle != 0) {
        HANDLE handle = reinterpret_cast<HANDLE>(processHandle);
        WaitForSingleObject(handle, 1500);
        CloseHandle(handle);
    }

    return true;
}

int colorDistance(const QColor &left, const QColor &right) {
    return qAbs(left.red() - right.red()) +
           qAbs(left.green() - right.green()) +
           qAbs(left.blue() - right.blue());
}

#endif

} // namespace

DocumentPane::DocumentPane(const QString &path, bool previewMode, QWidget *parent)
    : QWidget(parent)
    , m_filePath(QFileInfo(path).absoluteFilePath())
    , m_policy(resolveFileOpenPolicy(QFileInfo(m_filePath)))
    , m_previewMode(previewMode) {
    setObjectName("DocumentPane");
    
    QFileInfo info(m_filePath);
    QString suffix = info.suffix().toLower();
    if (m_policy.opensInApp()) {
        m_hostMode = WindowEmbed;
    } else if (suffix == "jpg" || suffix == "png" || suffix == "gif" || suffix == "svg" || suffix == "bmp" || suffix == "webp") {
        m_hostMode = ImagePreview;
    } else if (suffix == "txt" || suffix == "md" || suffix == "log" || suffix == "json" || suffix == "xml" || suffix == "cpp" || suffix == "py" || suffix == "rs" || suffix == "js" || suffix == "h") {
        m_hostMode = TextPreview;
    } else {
        m_hostMode = Fallback;
    }

    buildUi();

    connect(m_hostMonitor, &QTimer::timeout, this, &DocumentPane::handleHostedWindowHeartbeat);

    if (m_hostMode == ImagePreview) {
        setupImagePreview();
        m_hostedReady = true;
    } else if (m_hostMode == TextPreview) {
        setupTextPreview();
        m_hostedReady = true;
    } else if (m_hostMode == WindowEmbed) {
        m_hostedReady = startHosting();
    }

    syncUiState();
    emit pathChanged(m_filePath);
    emit selectionChanged(QFileInfo(m_filePath), 1, static_cast<quint64>(QFileInfo(m_filePath).size()));
}

DocumentPane::~DocumentPane() {
    clearHostedSurface();
}

bool DocumentPane::canReusePreviewTab() const {
    return m_previewMode;
}

bool DocumentPane::canClose() {
    clearHostedSurface();
    return true;
}

bool DocumentPane::canGoUp() const {
    return QFileInfo(m_filePath).dir().exists();
}

void DocumentPane::setPreviewMode(bool previewMode) {
    m_previewMode = previewMode;
    syncUiState();
}

void DocumentPane::reload() {
    clearHostedSurface();
    m_hostedReady = startHosting();
    syncUiState();
    emit statusMessage(QStringLiteral("Reloaded %1.").arg(QFileInfo(m_filePath).fileName()));
}

void DocumentPane::focusPrimaryControl() {
    if (m_hostSurface) {
        m_hostSurface->setFocus();
    } else if (m_externalButton) {
        m_externalButton->setFocus();
    }

#ifdef Q_OS_WIN
    if (m_hostedWindowId != 0 && IsWindow(reinterpret_cast<HWND>(m_hostedWindowId))) {
        SetActiveWindow(reinterpret_cast<HWND>(m_hostedWindowId));
        SetFocus(reinterpret_cast<HWND>(m_hostedWindowId));
        SetForegroundWindow(reinterpret_cast<HWND>(m_hostedWindowId));
    }
#endif
}

void DocumentPane::showEvent(QShowEvent *event) {
    QWidget::showEvent(event);
    setHostedWindowVisible(true);
    updateHostedGeometry();
}

void DocumentPane::hideEvent(QHideEvent *event) {
    setHostedWindowVisible(false);
    QWidget::hideEvent(event);
}

void DocumentPane::resizeEvent(QResizeEvent *event) {
    QWidget::resizeEvent(event);
    updateHostedGeometry();
    if (m_hostMode == WindowEmbed && m_hostedReady) {
        QTimer::singleShot(140, this, [this]() {
            if (m_hostMode == WindowEmbed && m_hostedReady) {
                refreshHostedBackdrop();
            }
        });
    }
}

void DocumentPane::buildUi() {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(12, 10, 12, 12);
    layout->setSpacing(10);

    m_contentRoot = new QWidget(this);
    m_contentRoot->setObjectName("DocumentHostRoot");
    m_contentLayout = new QVBoxLayout(m_contentRoot);
    m_contentLayout->setContentsMargins(0, 0, 0, 0);
    m_contentLayout->setSpacing(0);
    layout->addWidget(m_contentRoot, 1);

    m_hostSurface = new QWidget(m_contentRoot);
    m_hostSurface->setObjectName("HostedWindowSurface");
    m_hostSurface->setAttribute(Qt::WA_NativeWindow);
    m_hostSurface->setAttribute(Qt::WA_NoSystemBackground, false);
    m_hostSurface->setFocusPolicy(Qt::StrongFocus);
    m_hostSurface->installEventFilter(this);
    m_contentLayout->addWidget(m_hostSurface, 1);
    m_hostSurface->hide();

    m_stateCard = new QWidget(m_contentRoot);
    m_stateCard->setObjectName("DocumentHostState");
    auto *stateLayout = new QVBoxLayout(m_stateCard);
    stateLayout->setContentsMargins(32, 32, 32, 32);
    stateLayout->setSpacing(10);
    stateLayout->addStretch();

    m_stateTitle = new QLabel(m_stateCard);
    m_stateTitle->setObjectName("DocumentFallbackTitle");
    stateLayout->addWidget(m_stateTitle);

    m_stateBody = new QLabel(m_stateCard);
    m_stateBody->setObjectName("DocumentFallbackBody");
    m_stateBody->setWordWrap(true);
    stateLayout->addWidget(m_stateBody);

    m_externalButton = new QPushButton(QStringLiteral("Open externally"), m_stateCard);
    m_externalButton->setObjectName("DocumentGhostButton");
    connect(m_externalButton, &QPushButton::clicked, this, [this]() {
        emit openExternallyRequested(m_filePath);
    });
    stateLayout->addWidget(m_externalButton, 0, Qt::AlignLeft);
    stateLayout->addStretch();
    
    m_imageLabel = new QLabel(m_contentRoot);
    m_imageLabel->setAlignment(Qt::AlignCenter);
    m_contentLayout->addWidget(m_imageLabel, 1);
    m_imageLabel->hide();
    
    m_textEdit = new QPlainTextEdit(m_contentRoot);
    m_textEdit->setReadOnly(true);
    m_textEdit->setFont(QFont(QStringLiteral("Cascadia Mono"), 10));
    m_textEdit->installEventFilter(this);
    m_contentLayout->addWidget(m_textEdit, 1);
    m_textEdit->hide();

    m_contentLayout->addWidget(m_stateCard, 1);

    m_hostMonitor = new QTimer(this);
    m_hostMonitor->setInterval(650);
    
    m_loadingTimer = new QTimer(this);
    m_loadingTimer->setInterval(800);
    connect(m_loadingTimer, &QTimer::timeout, this, [this]() {
        m_skeletonPhase = !m_skeletonPhase;
        m_stateCard->setStyleSheet(m_skeletonPhase ? QString("background-color: %1;").arg(Colors::qc(Colors::BgElevated).name()) : QString("background-color: %1;").arg(Colors::qc(Colors::BgSurface).name()));
    });
}

bool DocumentPane::startHosting() {
#ifndef Q_OS_WIN
    showStateMessage(QStringLiteral("Windows hosting only"),
                     QStringLiteral("Exact associated-app embedding is only available on Windows."));
    return false;
#else
    const QFileInfo info(m_filePath);
    if (!info.exists() || !info.isFile()) {
        showStateMessage(QStringLiteral("File unavailable"),
                         QStringLiteral("This file is no longer available on disk."));
        return false;
    }

    const HWND hostHwnd = reinterpret_cast<HWND>(m_hostSurface->winId());
    if (!hostHwnd) {
        showStateMessage(QStringLiteral("Host surface unavailable"),
                         QStringLiteral("Ixplorer could not create a native host surface for this file."));
        return false;
    }

    const QSet<quintptr> baseline = snapshotTopLevelWindows();
    const QString expectedExecutable = associatedExecutableBaseName(m_filePath);
    const QString fileNameLower = info.fileName().toLower();
    const QString fileBaseNameLower = info.completeBaseName().toLower();

    HANDLE processHandle = nullptr;
    DWORD launchedProcessId = 0;
    if (!launchAssociatedAppForPath(m_filePath, &processHandle, &launchedProcessId)) {
        showStateMessage(QStringLiteral("Could not launch associated app"),
                         QStringLiteral("Windows could not open the default app for this file."));
        return false;
    }

    if (processHandle) {
        WaitForInputIdle(processHandle, 2500);
    }

    WindowCandidate chosen;
    QElapsedTimer timer;
    timer.start();

    while (timer.elapsed() < 18000) {
        chosen = findBestWindowCandidate(baseline, fileNameLower, fileBaseNameLower, expectedExecutable, launchedProcessId);
        const int requiredScore = expectedExecutable.isEmpty() ? 80 : 95;
        if (chosen.hwnd != nullptr && chosen.score >= requiredScore) {
            break;
        }

        QCoreApplication::processEvents();
        QThread::msleep(timer.elapsed() < 1500 ? 35 : 120);
    }

    if (chosen.hwnd == nullptr || !IsWindow(chosen.hwnd)) {
        if (processHandle) {
            CloseHandle(processHandle);
        }
        const QString suffix = info.suffix().toLower();
        if (suffix == QStringLiteral("jpg") || suffix == QStringLiteral("png") || suffix == QStringLiteral("gif") ||
            suffix == QStringLiteral("svg") || suffix == QStringLiteral("bmp") || suffix == QStringLiteral("webp")) {
            m_hostMode = ImagePreview;
            setupImagePreview();
            emit statusMessage(QStringLiteral("Previewing %1 while the native app host was unavailable.")
                                   .arg(info.fileName()));
            return true;
        }
        if (suffix == QStringLiteral("txt") || suffix == QStringLiteral("md") || suffix == QStringLiteral("log") ||
            suffix == QStringLiteral("json") || suffix == QStringLiteral("xml") || suffix == QStringLiteral("cpp") ||
            suffix == QStringLiteral("py") || suffix == QStringLiteral("rs") || suffix == QStringLiteral("js") ||
            suffix == QStringLiteral("h")) {
            m_hostMode = TextPreview;
            setupTextPreview();
            emit statusMessage(QStringLiteral("Previewing %1 while the native app host was unavailable.")
                                   .arg(info.fileName()));
            return true;
        }
        showStateMessage(QStringLiteral("Could not host the app window"),
                         QStringLiteral("Ixplorer could not capture the associated app window for %1. Use Open externally, or try again after the viewer finishes loading.")
                             .arg(info.fileName()));
        return false;
    }

    m_originalWindowParent = reinterpret_cast<quintptr>(GetParent(chosen.hwnd));
    m_originalWindowStyle = GetWindowLongPtrW(chosen.hwnd, GWL_STYLE);
    m_originalWindowExStyle = GetWindowLongPtrW(chosen.hwnd, GWL_EXSTYLE);

    // Strip top-level non-client chrome so the hosted app feels embedded rather than draggable.
    const LONG_PTR hostedStyle =
        (m_originalWindowStyle &
         ~static_cast<LONG_PTR>(WS_POPUP | WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU)) |
        static_cast<LONG_PTR>(WS_CHILD | WS_CLIPCHILDREN | WS_CLIPSIBLINGS);
    const LONG_PTR hostedExStyle =
        m_originalWindowExStyle & ~static_cast<LONG_PTR>(WS_EX_APPWINDOW | WS_EX_DLGMODALFRAME | WS_EX_CLIENTEDGE | WS_EX_STATICEDGE);

    ShowWindow(chosen.hwnd, SW_HIDE);
    SetWindowLongPtrW(chosen.hwnd, GWL_STYLE, hostedStyle);
    SetWindowLongPtrW(chosen.hwnd, GWL_EXSTYLE, hostedExStyle);
    SetParent(chosen.hwnd, hostHwnd);
    SetWindowPos(chosen.hwnd,
                 nullptr,
                 0,
                 0,
                 qMax(1, m_hostSurface->width()),
                 qMax(1, m_hostSurface->height()),
                 SWP_NOZORDER | SWP_FRAMECHANGED);

    m_hostedWindowId = reinterpret_cast<WId>(chosen.hwnd);
    m_processHandle = reinterpret_cast<quintptr>(processHandle);
    m_hostedReady = true;

    m_hostSurface->show();
    m_stateCard->hide();
    m_hostMonitor->start();
    updateHostedGeometry();
    setHostedWindowVisible(isVisible());
    refreshHostedBackdrop();
    QTimer::singleShot(300, this, [this]() {
        if (m_hostMode == WindowEmbed && m_hostedReady) {
            refreshHostedBackdrop();
        }
    });

    emit statusMessage(QStringLiteral("Hosted %1 inside the workspace.")
                           .arg(info.fileName()));
    return true;
#endif
}

void DocumentPane::clearHostedSurface() {
    if (m_hostMonitor) {
        m_hostMonitor->stop();
    }

    setHostedWindowVisible(false);

#ifdef Q_OS_WIN
    if (m_hostedWindowId != 0 || m_processHandle != 0) {
        closeHostedWindow(m_hostedWindowId, m_processHandle);
    }
#endif

    m_hostedWindowId = 0;
    m_processHandle = 0;
    m_originalWindowParent = 0;
    m_originalWindowStyle = 0;
    m_originalWindowExStyle = 0;
    m_hostedReady = false;
    m_backdropRefreshTick = 0;

    if (m_hostSurface) {
        m_hostSurface->hide();
    }
    if (m_imageLabel) {
        m_imageLabel->hide();
    }
    if (m_textEdit) {
        m_textEdit->hide();
    }
}

void DocumentPane::setHostedWindowVisible(bool visible) {
#ifdef Q_OS_WIN
    if (m_hostedWindowId != 0 && IsWindow(reinterpret_cast<HWND>(m_hostedWindowId))) {
        ShowWindow(reinterpret_cast<HWND>(m_hostedWindowId), visible ? SW_SHOWNA : SW_HIDE);
    }
#else
    Q_UNUSED(visible);
#endif
}

void DocumentPane::updateHostedGeometry() {
#ifdef Q_OS_WIN
    if (m_hostedWindowId == 0 || !m_hostSurface || !IsWindow(reinterpret_cast<HWND>(m_hostedWindowId))) {
        return;
    }

    SetWindowPos(reinterpret_cast<HWND>(m_hostedWindowId),
                 nullptr,
                 0,
                 0,
                 qMax(1, m_hostSurface->width()),
                 qMax(1, m_hostSurface->height()),
                 SWP_NOZORDER | SWP_NOACTIVATE | SWP_NOCOPYBITS);
#endif
}

void DocumentPane::handleHostedWindowHeartbeat() {
#ifdef Q_OS_WIN
    if (m_hostedWindowId == 0) {
        return;
    }

    if (!IsWindow(reinterpret_cast<HWND>(m_hostedWindowId))) {
        if (m_processHandle != 0) {
            CloseHandle(reinterpret_cast<HANDLE>(m_processHandle));
        }
        m_hostedWindowId = 0;
        m_processHandle = 0;
        m_originalWindowParent = 0;
        m_originalWindowStyle = 0;
        m_originalWindowExStyle = 0;
        m_hostedReady = false;
        m_hostMonitor->stop();
        syncUiState();
        showStateMessage(QStringLiteral("Hosted app closed"),
                         QStringLiteral("The embedded app window was closed. Reload the tab to relaunch it here, or open it externally."));
        emit statusMessage(QStringLiteral("%1 was closed.").arg(QFileInfo(m_filePath).fileName()));
        return;
    }

    updateHostedGeometry();
    ++m_backdropRefreshTick;
#endif
}

void DocumentPane::refreshHostedBackdrop() {
#ifdef Q_OS_WIN
    if (m_hostedWindowId == 0 || !m_hostSurface || !isVisible()) {
        return;
    }

    QWindow *windowHandle = window()->windowHandle();
    QScreen *screen = windowHandle ? windowHandle->screen() : QGuiApplication::primaryScreen();
    if (!screen) {
        return;
    }

    const int sampleWidth = qMax(1, qMin(320, m_hostSurface->width()));
    const int sampleHeight = qMax(1, qMin(220, m_hostSurface->height()));
    const QPixmap pixmap = screen->grabWindow(m_hostedWindowId, 0, 0, sampleWidth, sampleHeight);
    if (pixmap.isNull()) {
        return;
    }

    const QImage image = pixmap.toImage().convertToFormat(QImage::Format_ARGB32);
    if (image.isNull()) {
        return;
    }

    qint64 red = 0;
    qint64 green = 0;
    qint64 blue = 0;
    qint64 samples = 0;

    const int stepX = qMax(1, image.width() / 24);
    const int stepY = qMax(1, image.height() / 18);
    for (int y = 0; y < image.height(); y += stepY) {
        for (int x = 0; x < image.width(); x += stepX) {
            const QColor pixel = QColor::fromRgba(image.pixel(x, y));
            if (pixel.alpha() < 200) {
                continue;
            }
            red += pixel.red();
            green += pixel.green();
            blue += pixel.blue();
            ++samples;
        }
    }

    if (samples == 0) {
        return;
    }

    QColor backdrop(static_cast<int>(red / samples),
                    static_cast<int>(green / samples),
                    static_cast<int>(blue / samples));
    if (backdrop.lightness() > 150) {
        backdrop = backdrop.darker(125);
    } else {
        backdrop = backdrop.darker(110);
    }
    applyHostedBackdrop(backdrop);
#endif
}

void DocumentPane::applyHostedBackdrop(const QColor &color) {
    if (m_surfaceTone.isValid() && colorDistance(m_surfaceTone, color) < 18) {
        return;
    }
    m_surfaceTone = color;
    const QString frame = color.name(QColor::HexRgb);
    const QColor edge = color.lighter(120);
    const QString edgeHex = edge.name(QColor::HexRgb);
    m_contentRoot->setStyleSheet(QStringLiteral(
        "QWidget#DocumentHostRoot {"
        " background-color: %1;"
        " border: 1px solid %2;"
        " border-radius: 18px;"
        "}"
        "QWidget#HostedWindowSurface {"
        " background-color: %1;"
        " border: 1px solid %2;"
        " border-radius: 18px;"
        "}").arg(frame, edgeHex));
    emit surfaceToneChanged(m_surfaceTone);
}

void DocumentPane::setupImagePreview() {
    QPixmap pixmap(m_filePath);
    if (pixmap.isNull()) {
        m_hostMode = Fallback;
        m_hostedReady = false;
        return;
    }
    // Scale down if needed, keeping aspect ratio
    if (pixmap.width() > 1920 || pixmap.height() > 1080) {
        pixmap = pixmap.scaled(1920, 1080, Qt::KeepAspectRatio, Qt::SmoothTransformation);
    }
    m_imageLabel->setPixmap(pixmap);
    m_imageLabel->show();
    m_stateCard->hide();
    m_hostSurface->hide();
    m_textEdit->hide();
    applyHostedBackdrop(QColor(28, 30, 34));
}

void DocumentPane::setupTextPreview() {
    QFile file(m_filePath);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        m_hostMode = Fallback;
        m_hostedReady = false;
        return;
    }
    // Read up to 64KB
    QByteArray data = file.read(64 * 1024);
    m_textEdit->setPlainText(QString::fromUtf8(data));
    m_textEdit->show();
    m_stateCard->hide();
    m_hostSurface->hide();
    m_imageLabel->hide();
    applyHostedBackdrop(QColor(20, 22, 26));
}

void DocumentPane::showStateMessage(const QString &title, const QString &body) {
    if (m_hostSurface) {
        m_hostSurface->hide();
    }
    if (m_imageLabel) {
        m_imageLabel->hide();
    }
    if (m_textEdit) {
        m_textEdit->hide();
    }
    if (m_contentRoot) {
        m_contentRoot->setStyleSheet(QString());
    }
    m_stateTitle->setText(title);
    m_stateBody->setText(body);
    m_stateCard->show();
    m_surfaceTone = QColor(24, 26, 30);
    emit surfaceToneChanged(m_surfaceTone);
}

void DocumentPane::syncUiState() {
    if (m_hostedReady) {
        if (m_hostSurface) {
            m_hostSurface->show();
        }
        m_stateCard->hide();
        return;
    }

    if (m_hostMode == ImagePreview || m_hostMode == TextPreview) {
        m_stateCard->hide();
        return;
    }

    if (m_policy.opensInApp()) {
        showStateMessage(
            QStringLiteral("Associated app not embedded"),
            QStringLiteral("Ixplorer kept this tab in-app, but the associated window has not been captured yet."));
    } else {
        showStateMessage(m_policy.summary, m_policy.detail);
    }
}

bool DocumentPane::eventFilter(QObject *watched, QEvent *event) {
    if ((watched == m_hostSurface || watched == m_textEdit) &&
        (event->type() == QEvent::MouseButtonPress || event->type() == QEvent::FocusIn)) {
#ifdef Q_OS_WIN
        if (m_hostedWindowId != 0 && IsWindow(reinterpret_cast<HWND>(m_hostedWindowId))) {
            SetActiveWindow(reinterpret_cast<HWND>(m_hostedWindowId));
            SetFocus(reinterpret_cast<HWND>(m_hostedWindowId));
            SetForegroundWindow(reinterpret_cast<HWND>(m_hostedWindowId));
        }
#endif
    }

    return QWidget::eventFilter(watched, event);
}

} // namespace Ixplorer
