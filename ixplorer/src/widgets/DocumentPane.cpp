#include "widgets/DocumentPane.h"
#include "widgets/CodeViewerWidget.h"
#include "theme/Colors.h"

#include <QCoreApplication>
#include <QDateTime>
#include <QEvent>
#include <QGuiApplication>
#include <QDir>
#include <QElapsedTimer>
#include <QFile>
#include <QFileInfo>
#include <QHideEvent>
#include <QImage>
#include <QLabel>
#include <QJsonDocument>
#include <QJsonObject>
#include <QLocale>
#include <QMimeDatabase>
#include <QPixmap>
#include <QPlainTextEdit>
#include <QPushButton>
#include <QResizeEvent>
#include <QScreen>
#include <QShowEvent>
#include <QStringList>
#include <QThread>
#include <QTimer>
#include <QUrl>
#include <QVBoxLayout>
#include <QWindow>
#include <QStandardPaths>
#include <QGraphicsView>
#include <QGraphicsScene>
#include <QGraphicsPixmapItem>
#include <QSet>
#include <QWheelEvent>
#include <QMouseEvent>
#include <string>

#ifdef QT_WEBENGINEWIDGETS_LIB
#include <QWebEngineView>
#endif

#ifdef QT_MULTIMEDIA_LIB
#include <QMediaPlayer>
#include <QVideoWidget>
#include <QAudioOutput>
#endif

#ifdef QT_PDF_LIB
#include <QPdfDocument>
#include <QPdfView>
#endif

#ifdef Q_OS_WIN
#include <qt_windows.h>
#include <shellapi.h>
#include <shlwapi.h>
#endif

#if defined(Q_OS_WIN) && defined(QT_AXCONTAINER_LIB)
#include <QAxWidget>
#endif

namespace Ixplorer {

namespace {

#ifdef Q_OS_WIN

struct WindowCandidate {
    HWND hwnd = nullptr;
    int score = -1;
    bool isNew = false;
};

struct CandidateSearchContext {
    const QSet<quintptr> *baseline = nullptr;
    const QSet<WId> *claimedWindows = nullptr;
    WId allowedClaimedWindow = 0;
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

bool isUwpFrameWindow(HWND hwnd) {
    wchar_t className[256];
    if (GetClassNameW(hwnd, className, 256) <= 0) {
        return false;
    }
    return wcscmp(className, L"ApplicationFrameWindow") == 0;
}

QSet<WId> &claimedHostedWindows() {
    static QSet<WId> windows;
    return windows;
}

WindowCandidate findBestWindowCandidate(const QSet<quintptr> &baseline,
                                        const QSet<WId> &claimedWindows,
                                        WId allowedClaimedWindow,
                                        const QString &fileNameLower,
                                        const QString &fileBaseNameLower,
                                        const QString &expectedExecutableLower,
                                        DWORD launchedProcessId) {
    WindowCandidate best;
    CandidateSearchContext context{
        &baseline, &claimedWindows, allowedClaimedWindow, fileNameLower, fileBaseNameLower, expectedExecutableLower, launchedProcessId, &best};

    EnumWindows(
        [](HWND hwnd, LPARAM lParam) -> BOOL {
            auto *context = reinterpret_cast<CandidateSearchContext *>(lParam);

            if (!isTopLevelEmbeddableWindow(hwnd)) {
                return TRUE;
            }

            DWORD pid = 0;
            GetWindowThreadProcessId(hwnd, &pid);
            const WId candidateId = reinterpret_cast<WId>(hwnd);
            if (context->claimedWindows->contains(candidateId) && candidateId != context->allowedClaimedWindow) {
                return TRUE;
            }

            const QString title = windowTitle(hwnd).toLower();
            const QString executable = processExecutableBaseName(pid);
            const bool isNew = !context->baseline->contains(reinterpret_cast<quintptr>(hwnd));
            const bool titleMatches =
                (!context->fileNameLower.isEmpty() && title.contains(context->fileNameLower)) ||
                (!context->fileBaseNameLower.isEmpty() && title.contains(context->fileBaseNameLower));
            const bool pidMatches = context->launchedProcessId != 0 && pid == context->launchedProcessId;
            const bool executableMatches =
                !context->expectedExecutableLower.isEmpty() && executable == context->expectedExecutableLower;
            if (!titleMatches && !pidMatches) {
                return TRUE;
            }

            int score = 0;
            if (titleMatches) {
                score += 85;
            }
            if (pidMatches) {
                score += 60;
            }
            if (executableMatches) {
                score += 15;
            }
            if (isNew) {
                score += 10;
            }
            if (!title.isEmpty()) {
                score += 10;
            }

            if (score > context->best->score) {
                context->best->hwnd = hwnd;
                context->best->score = score;
                context->best->isNew = isNew;
            }

            return TRUE;
        },
        reinterpret_cast<LPARAM>(&context));

    return best;
}

void hideVisibleCandidateWindows(const QString &fileNameLower,
                                 const QString &fileBaseNameLower,
                                 const QString &expectedExecutableLower,
                                 DWORD launchedProcessId) {
    WindowCandidate dummyBest;
    CandidateSearchContext context{
        nullptr,
        nullptr,
        0,
        fileNameLower,
        fileBaseNameLower,
        expectedExecutableLower,
        launchedProcessId,
        &dummyBest};

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

            const bool titleMatches =
                (!context->fileNameLower.isEmpty() && title.contains(context->fileNameLower)) ||
                (!context->fileBaseNameLower.isEmpty() && title.contains(context->fileBaseNameLower));
            const bool executableMatches =
                !context->expectedExecutableLower.isEmpty() && executable == context->expectedExecutableLower;
            const bool pidMatches = context->launchedProcessId != 0 && pid == context->launchedProcessId;

            if ((pidMatches || (titleMatches && executableMatches)) && IsWindowVisible(hwnd)) {
                ShowWindow(hwnd, SW_HIDE);
            }
            return TRUE;
        },
        reinterpret_cast<LPARAM>(&context));
}

QString associatedExecutablePath(const QString &path) {
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

    return QString::fromWCharArray(buffer.c_str()).trimmed();
}

QStringList launchArgumentsForExecutable(const QString &executableLower, const QString &nativePath) {
    if (executableLower == QStringLiteral("code.exe") ||
        executableLower == QStringLiteral("code-insiders.exe") ||
        executableLower == QStringLiteral("codium.exe")) {
        return {QStringLiteral("--new-window"), QStringLiteral("--wait"), nativePath};
    }

    if (executableLower == QStringLiteral("winword.exe")) {
        return {QStringLiteral("/n"), nativePath};
    }
    if (executableLower == QStringLiteral("excel.exe")) {
        return {QStringLiteral("/x"), nativePath};
    }
    if (executableLower == QStringLiteral("powerpnt.exe")) {
        return {QStringLiteral("/n"), nativePath};
    }

    if (executableLower == QStringLiteral("chrome.exe") ||
        executableLower == QStringLiteral("msedge.exe") ||
        executableLower == QStringLiteral("brave.exe") ||
        executableLower == QStringLiteral("opera.exe") ||
        executableLower == QStringLiteral("firefox.exe")) {
        return {QStringLiteral("--new-window"), nativePath};
    }

    return {nativePath};
}

QString quotedCommandLine(const QString &executablePath, const QStringList &arguments) {
    QString command = QStringLiteral("\"%1\"").arg(QDir::toNativeSeparators(executablePath));
    for (const QString &arg : arguments) {
        QString quoted = arg;
        quoted.replace(QLatin1Char('"'), QStringLiteral("\\\""));
        command += QStringLiteral(" \"%1\"").arg(quoted);
    }
    return command;
}

bool launchAssociatedAppForPath(const QString &path,
                                const QString &expectedExecutable,
                                HANDLE *processHandle,
                                DWORD *processId,
                                bool *ownsProcess) {
    const QString nativePath = QDir::toNativeSeparators(path);
    if (processHandle) {
        *processHandle = nullptr;
    }
    if (processId) {
        *processId = 0;
    }
    if (ownsProcess) {
        *ownsProcess = false;
    }

    const QString executablePath = associatedExecutablePath(path);
    const QString executableLower = expectedExecutable.trimmed().toLower();
    if (!executablePath.isEmpty()) {
        const QStringList args = launchArgumentsForExecutable(executableLower, nativePath);
        const QString command = quotedCommandLine(executablePath, args);
        STARTUPINFOW startupInfo{};
        startupInfo.cb = sizeof(startupInfo);
        startupInfo.dwFlags = STARTF_USESHOWWINDOW;
        startupInfo.wShowWindow = SW_SHOWMINNOACTIVE;

        PROCESS_INFORMATION processInfo{};
        std::wstring commandLine = command.toStdWString();
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
            if (ownsProcess) {
                *ownsProcess = true;
            }
            return true;
        }
    }

    SHELLEXECUTEINFOW info{};
    info.cbSize = sizeof(info);
    info.fMask = SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC | SEE_MASK_FLAG_NO_UI;
    info.lpVerb = L"open";
    info.lpFile = reinterpret_cast<LPCWSTR>(nativePath.utf16());
    info.nShow = SW_SHOWMINNOACTIVE;

    if (!ShellExecuteExW(&info)) {
        return false;
    }

    if (processHandle) {
        *processHandle = info.hProcess;
    }
    if (processId) {
        *processId = info.hProcess ? GetProcessId(info.hProcess) : 0;
    }
    if (ownsProcess) {
        *ownsProcess = false;
    }
    return true;
}

bool closeHostedWindow(WId windowId, quintptr processHandle, bool ownsProcess) {
    if (windowId != 0 && IsWindow(reinterpret_cast<HWND>(windowId))) {
        if (ownsProcess) {
            PostMessageW(reinterpret_cast<HWND>(windowId), WM_CLOSE, 0, 0);
        }
    }

    if (processHandle != 0) {
        HANDLE handle = reinterpret_cast<HANDLE>(processHandle);
        if (ownsProcess) {
            WaitForSingleObject(handle, 1500);
        }
        CloseHandle(handle);
    }

    return true;
}

struct HostingProfile {
    int captureTimeoutMs = 18000;
    int inputIdleTimeoutMs = 2500;
    int heartbeatIntervalMs = 180;
    bool mutateWindowStyle = true;
};

HostingProfile hostingProfileForExecutable(const QString &executableLower) {
    HostingProfile profile;

    if (executableLower == QStringLiteral("winword.exe") ||
        executableLower == QStringLiteral("excel.exe") ||
        executableLower == QStringLiteral("powerpnt.exe") ||
        executableLower == QStringLiteral("acrord32.exe") ||
        executableLower == QStringLiteral("outlook.exe")) {
        profile.captureTimeoutMs = 23000;
        profile.inputIdleTimeoutMs = 3500;
        profile.heartbeatIntervalMs = 240;
        profile.mutateWindowStyle = false;
        return profile;
    }

    if (executableLower == QStringLiteral("code.exe") ||
        executableLower == QStringLiteral("code-insiders.exe") ||
        executableLower == QStringLiteral("codium.exe") ||
        executableLower == QStringLiteral("notepad++.exe") ||
        executableLower == QStringLiteral("sublime_text.exe")) {
        profile.captureTimeoutMs = 12000;
        profile.inputIdleTimeoutMs = 1200;
        profile.heartbeatIntervalMs = 150;
        profile.mutateWindowStyle = true;
        return profile;
    }

    if (executableLower == QStringLiteral("photos.exe") ||
        executableLower == QStringLiteral("mspaint.exe")) {
        profile.captureTimeoutMs = 20000;
        profile.inputIdleTimeoutMs = 3000;
        profile.heartbeatIntervalMs = 260;
        profile.mutateWindowStyle = false;
        return profile;
    }

    return profile;
}

QString embedDiagnosticsPath() {
    QString dir = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation);
    if (dir.isEmpty()) {
        dir = QDir::homePath() + QStringLiteral("/.ixplorer");
    }
    QDir().mkpath(dir);
    return dir + QStringLiteral("/embed_hosting_v1.jsonl");
}

void logEmbedEvent(const QString &stage, const QString &path, const QJsonObject &extra = {}) {
    QJsonObject event{
        {QStringLiteral("timestamp_ms"), QString::number(QDateTime::currentMSecsSinceEpoch())},
        {QStringLiteral("stage"), stage},
        {QStringLiteral("path"), path},
    };
    for (auto it = extra.begin(); it != extra.end(); ++it) {
        event.insert(it.key(), it.value());
    }

    const QString logPath = embedDiagnosticsPath();
    QFile file(logPath);
    if (file.open(QIODevice::WriteOnly | QIODevice::Append)) {
        file.write(QJsonDocument(event).toJson(QJsonDocument::Compact));
        file.write("\n");
    }
}

int colorDistance(const QColor &left, const QColor &right) {
    return qAbs(left.red() - right.red()) +
           qAbs(left.green() - right.green()) +
           qAbs(left.blue() - right.blue());
}

#endif

} // namespace

DocumentPane::DocumentPane(const QString &path, bool previewMode, QWidget *parent, bool launchDeferred)
    : QWidget(parent)
    , m_filePath(QFileInfo(path).absoluteFilePath())
    , m_policy(resolveFileOpenPolicy(QFileInfo(m_filePath)))
    , m_previewMode(previewMode)
    , m_launchDeferred(launchDeferred) {
    setObjectName("DocumentPane");
    
    switch (m_policy.preferredMode) {
    case FileOpenHostMode::CodeViewer:
        m_hostMode = CodeViewer;
        break;
    case FileOpenHostMode::ImageViewer:
        m_hostMode = ImageViewer;
        break;
    case FileOpenHostMode::MediaPlayer:
        m_hostMode = MediaPlayer;
        break;
    case FileOpenHostMode::WebView:
    {
        const QString ext = QFileInfo(m_filePath).suffix().toLower();
        if (ext == QStringLiteral("pdf")) {
#ifdef QT_PDF_LIB
            m_hostMode = PdfViewer;
#elif defined(QT_WEBENGINEWIDGETS_LIB)
            m_hostMode = WebView;
#else
            m_hostMode = WindowEmbed;
#endif
            break;
        }
#ifdef QT_WEBENGINEWIDGETS_LIB
        m_hostMode = WebView;
#else
        m_hostMode = CodeViewer;
#endif
    }
        break;
    case FileOpenHostMode::AssociatedWindow:
        m_hostMode = WindowEmbed;
        break;
    case FileOpenHostMode::OfficeEmbed:
        m_hostMode = OfficeEmbed;
        break;
    case FileOpenHostMode::Fallback:
    default:
        m_hostMode = Fallback;
        break;
    }

    buildUi();

    connect(m_hostMonitor, &QTimer::timeout, this, &DocumentPane::handleHostedWindowHeartbeat);

    // Show a loading state first, then set up the viewer
    if (m_hostMode == WindowEmbed) {
        if (m_launchDeferred) {
            // Session restore: show a "Click to reopen" prompt instead of auto-launching
            showStateMessage(QStringLiteral("Click to reopen"),
                             QStringLiteral("Click to launch the associated application for %1.")
                                 .arg(QFileInfo(m_filePath).fileName()));
            if (m_externalButton) {
                QPushButton *reopenBtn = new QPushButton(QStringLiteral("Reopen"), m_stateCard);
                reopenBtn->setObjectName("ReopenButton");
                connect(reopenBtn, &QPushButton::clicked, this, [this]() {
                    m_launchDeferred = false;
                    showStateMessage(QStringLiteral("Opening..."),
                                     QStringLiteral("Launching the associated application for %1.")
                                         .arg(QFileInfo(m_filePath).fileName()));
                    m_loadingTimer->start();
                    QTimer::singleShot(50, this, [this]() {
                        m_loadingTimer->stop();
                        m_hostedReady = startHosting();
                        if (!m_hostedReady) {
                            setupHostFailureFallback();
                        }
                        syncUiState();
                    });
                });
                if (m_stateCard->layout()) {
                    m_stateCard->layout()->addWidget(reopenBtn);
                }
            }
        } else {
            showStateMessage(QStringLiteral("Opening..."),
                             QStringLiteral("Launching the associated application for %1.")
                                 .arg(QFileInfo(m_filePath).fileName()));
            m_loadingTimer->start();
            // Defer hosting to let the UI paint the loading state first
            QTimer::singleShot(50, this, [this]() {
                m_loadingTimer->stop();
                m_hostedReady = startHosting();
                if (!m_hostedReady) {
                    setupHostFailureFallback();
                }
                syncUiState();
            });
        }
    } else if (m_hostMode == CodeViewer) {
        setupCodeViewer();
    } else if (m_hostMode == ImageViewer) {
        setupImageViewer();
    } else if (m_hostMode == MediaPlayer) {
        setupMediaPlayer();
    } else if (m_hostMode == PdfViewer) {
        setupPdfViewer();
    } else if (m_hostMode == WebView) {
        setupWebView();
    } else if (m_hostMode == OfficeEmbed) {
        setupOfficeEmbed();
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
    if (m_policy.usesHostedWindow() && m_hostMode == CodeViewer) {
        m_hostMode = WindowEmbed;
    }
    if (m_hostMode == CodeViewer) {
        setupCodeViewer();
    } else if (m_hostMode == ImageViewer) {
        setupImageViewer();
    } else if (m_hostMode == MediaPlayer) {
        setupMediaPlayer();
    } else if (m_hostMode == PdfViewer) {
        setupPdfViewer();
    } else if (m_hostMode == WebView) {
        setupWebView();
    } else if (m_hostMode == WindowEmbed) {
        m_hostedReady = startHosting();
        if (!m_hostedReady) {
            setupHostFailureFallback();
        }
    } else if (m_hostMode == OfficeEmbed) {
        setupOfficeEmbed();
    }
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
    if (m_hostMode == ImageViewer && m_graphicsView && m_graphicsScene) {
        m_graphicsView->fitInView(m_graphicsScene->sceneRect(), Qt::KeepAspectRatio);
    }
}

void DocumentPane::hideEvent(QHideEvent *event) {
    setHostedWindowVisible(false);
    QWidget::hideEvent(event);
}

void DocumentPane::resizeEvent(QResizeEvent *event) {
    QWidget::resizeEvent(event);
    updateHostedGeometry();
    if (m_hostMode == ImageViewer && m_graphicsView && m_graphicsScene) {
        m_graphicsView->fitInView(m_graphicsScene->sceneRect(), Qt::KeepAspectRatio);
    }
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
    layout->setContentsMargins(8, 6, 8, 8);
    layout->setSpacing(0);

    m_contentRoot = new QWidget(this);
    m_contentRoot->setObjectName("DocumentHostRoot");
    m_contentLayout = new QVBoxLayout(m_contentRoot);
    m_contentLayout->setContentsMargins(0, 0, 0, 0);
    m_contentLayout->setSpacing(0);
    layout->addWidget(m_contentRoot, 1);

    m_hostFrame = new QWidget(m_contentRoot);
    m_hostFrame->setObjectName("HostedWindowFrame");
    auto *hostFrameLayout = new QVBoxLayout(m_hostFrame);
    hostFrameLayout->setContentsMargins(1, 1, 1, 1);
    hostFrameLayout->setSpacing(0);
    m_contentLayout->addWidget(m_hostFrame, 1);
    m_hostFrame->hide();

    m_hostSurface = new QWidget(m_hostFrame);
    m_hostSurface->setObjectName("HostedWindowSurface");
    m_hostSurface->setAttribute(Qt::WA_NativeWindow);
    m_hostSurface->setAttribute(Qt::WA_NoSystemBackground, false);
    m_hostSurface->setFocusPolicy(Qt::StrongFocus);
    m_hostSurface->installEventFilter(this);
    hostFrameLayout->addWidget(m_hostSurface, 1);
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
    
    m_graphicsScene = new QGraphicsScene(this);
    m_graphicsView = new QGraphicsView(m_graphicsScene, m_contentRoot);
    m_graphicsView->setDragMode(QGraphicsView::ScrollHandDrag);
    m_graphicsView->setRenderHint(QPainter::Antialiasing);
    m_graphicsView->setStyleSheet("background-color: transparent; border: none;");
    m_graphicsView->installEventFilter(this);
    m_contentLayout->addWidget(m_graphicsView, 1);
    m_graphicsView->hide();
    
    m_codeViewer = new CodeViewerWidget(m_contentRoot);
    m_contentLayout->addWidget(m_codeViewer, 1);
    m_codeViewer->hide();

#ifdef QT_WEBENGINEWIDGETS_LIB
    m_webView = new QWebEngineView(m_contentRoot);
    m_webView->settings()->setAttribute(QWebEngineSettings::PluginsEnabled, true);
    m_contentLayout->addWidget(m_webView, 1);
    m_webView->hide();
#endif

#ifdef QT_PDF_LIB
    m_pdfDocument = new QPdfDocument(this);
    m_pdfView = new QPdfView(m_contentRoot);
    m_pdfView->setDocument(m_pdfDocument);
    m_pdfView->setPageMode(QPdfView::MultiPage);
    m_pdfView->setZoomMode(QPdfView::FitToWidth);
    m_contentLayout->addWidget(m_pdfView, 1);
    m_pdfView->hide();
#endif

#ifdef QT_MULTIMEDIA_LIB
    m_videoWidget = new QVideoWidget(m_contentRoot);
    m_contentLayout->addWidget(m_videoWidget, 1);
    m_videoWidget->hide();
#endif

    m_contentLayout->addWidget(m_stateCard, 1);

    m_hostMonitor = new QTimer(this);
    m_hostMonitor->setInterval(180);
    
    m_loadingTimer = new QTimer(this);
    m_loadingTimer->setInterval(600);
    connect(m_loadingTimer, &QTimer::timeout, this, [this]() {
        m_skeletonPhase = !m_skeletonPhase;
        const int alpha = m_skeletonPhase ? 8 : 3;
        m_stateCard->setStyleSheet(
            QStringLiteral("background-color: rgba(255, 255, 255, %1); border-radius: 8px;")
                .arg(alpha * 0.01, 0, 'f', 2));
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
    logEmbedEvent(QStringLiteral("host_start"), m_filePath);

    const HWND hostHwnd = reinterpret_cast<HWND>(m_hostSurface->winId());
    if (!hostHwnd) {
        showStateMessage(QStringLiteral("Host surface unavailable"),
                         QStringLiteral("Ixplorer could not create a native host surface for this file."));
        logEmbedEvent(QStringLiteral("host_surface_missing"), m_filePath);
        return false;
    }

    const QSet<quintptr> baseline = snapshotTopLevelWindows();
    const QString expectedExecutable = associatedExecutableBaseName(m_filePath);
    const HostingProfile profile = hostingProfileForExecutable(expectedExecutable);
    if (m_hostMonitor != nullptr) {
        m_hostMonitor->setInterval(profile.heartbeatIntervalMs);
    }
    const QString fileNameLower = info.fileName().toLower();
    const QString fileBaseNameLower = info.completeBaseName().toLower();

    AllowSetForegroundWindow(ASFW_ANY);

    HANDLE processHandle = nullptr;
    DWORD launchedProcessId = 0;
    bool ownsProcess = false;
    if (!launchAssociatedAppForPath(m_filePath, expectedExecutable, &processHandle, &launchedProcessId, &ownsProcess)) {
        showStateMessage(QStringLiteral("Could not launch associated app"),
                         QStringLiteral("Windows could not open the default app for this file."));
        logEmbedEvent(QStringLiteral("launch_failed"), m_filePath, QJsonObject{
            {QStringLiteral("expected_executable"), expectedExecutable},
        });
        return false;
    }

    logEmbedEvent(QStringLiteral("launch_ok"), m_filePath, QJsonObject{
        {QStringLiteral("expected_executable"), expectedExecutable},
        {QStringLiteral("process_id"), static_cast<qint64>(launchedProcessId)},
    });
    hideVisibleCandidateWindows(fileNameLower, fileBaseNameLower, expectedExecutable, launchedProcessId);

    if (processHandle) {
        WaitForInputIdle(processHandle, static_cast<DWORD>(profile.inputIdleTimeoutMs));
    }

    WindowCandidate chosen;
    QElapsedTimer timer;
    timer.start();

    while (timer.elapsed() < profile.captureTimeoutMs) {
        DWORD currentPid = launchedProcessId;
        if (processHandle != nullptr && WaitForSingleObject(processHandle, 0) != WAIT_TIMEOUT) {
            currentPid = 0; // Process exited, search broadly
        }

        hideVisibleCandidateWindows(fileNameLower, fileBaseNameLower, expectedExecutable, currentPid);

        chosen = findBestWindowCandidate(
            baseline, claimedHostedWindows(), 0, fileNameLower, fileBaseNameLower, expectedExecutable, currentPid);
        if (chosen.hwnd != nullptr && IsWindow(chosen.hwnd)) {
            ShowWindow(chosen.hwnd, SW_HIDE);
        }

        const qint64 elapsed = timer.elapsed();
        int requiredScore = expectedExecutable.isEmpty() ? 40 : 55;
        if (elapsed > 2500) {
            requiredScore -= 10;
        }
        if (elapsed > 6000) {
            requiredScore -= 10;
        }
        if (elapsed > 8000) {
            requiredScore -= 5;
        }
        if (chosen.hwnd != nullptr && chosen.score >= requiredScore) {
            break;
        }

        QCoreApplication::processEvents();
        QThread::msleep(timer.elapsed() < 1800 ? 10 : 80);
    }

    const int minimumAcceptableScore = expectedExecutable.isEmpty() ? 20 : 30;
    if (chosen.hwnd == nullptr || !IsWindow(chosen.hwnd) || chosen.score < minimumAcceptableScore) {
        if (processHandle) {
            CloseHandle(processHandle);
        }
        showStateMessage(QStringLiteral("Could not host the app window"),
                         QStringLiteral("Ixplorer could not capture the associated app window for %1. Use Open externally, or try again after the viewer finishes loading.")
                             .arg(info.fileName()));
        logEmbedEvent(QStringLiteral("capture_failed"), m_filePath, QJsonObject{
            {QStringLiteral("expected_executable"), expectedExecutable},
            {QStringLiteral("candidate_score"), chosen.score},
            {QStringLiteral("elapsed_ms"), timer.elapsed()},
        });
        return false;
    }

    m_originalWindowParent = reinterpret_cast<quintptr>(GetParent(chosen.hwnd));
    m_originalWindowStyle = GetWindowLongPtrW(chosen.hwnd, GWL_STYLE);
    m_originalWindowExStyle = GetWindowLongPtrW(chosen.hwnd, GWL_EXSTYLE);

    ShowWindow(chosen.hwnd, SW_HIDE);
    if (profile.mutateWindowStyle && !isUwpFrameWindow(chosen.hwnd)) {
        LONG_PTR hostedStyle = m_originalWindowStyle;
        hostedStyle &= ~static_cast<LONG_PTR>(WS_POPUP);
        hostedStyle |= static_cast<LONG_PTR>(WS_CHILD);
        SetWindowLongPtrW(chosen.hwnd, GWL_STYLE, hostedStyle);
    }
    SetParent(chosen.hwnd, hostHwnd);
    {
        const qreal dpr = m_hostSurface->devicePixelRatioF();
        const int w = qMax(1, static_cast<int>(m_hostSurface->width() * dpr));
        const int h = qMax(1, static_cast<int>(m_hostSurface->height() * dpr));
        SetWindowPos(chosen.hwnd, nullptr, 0, 0, w, h,
                     SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED);
    }
    RedrawWindow(chosen.hwnd, nullptr, nullptr, RDW_INVALIDATE | RDW_UPDATENOW | RDW_ALLCHILDREN);

    m_hostedWindowId = reinterpret_cast<WId>(chosen.hwnd);
    m_processHandle = reinterpret_cast<quintptr>(processHandle);
    m_ownsHostedProcess = ownsProcess;
    claimedHostedWindows().insert(m_hostedWindowId);
    m_hostedWindowClaimed = true;
    m_hostedReady = true;
    m_hostedExecutable = expectedExecutable;
    m_recoveryAttempts = 0;
    m_nextRecoveryAttemptMs = 0;

    if (m_hostFrame) {
        m_hostFrame->show();
    }
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
    logEmbedEvent(QStringLiteral("capture_ok"), m_filePath, QJsonObject{
        {QStringLiteral("expected_executable"), expectedExecutable},
        {QStringLiteral("candidate_score"), chosen.score},
        {QStringLiteral("elapsed_ms"), timer.elapsed()},
    });
    return true;
#endif
}

bool DocumentPane::setupHostFailureFallback() {
    if (m_hostMode != WindowEmbed) {
        return false;
    }

    const QFileInfo info(m_filePath);
    if (!info.exists() || !info.isFile()) {
        return false;
    }

    // Auto-fallback: try built-in viewer for known MIME types before showing error
    const QString ext = info.suffix().toLower();
    static const QMimeDatabase mimeDb;
    const QMimeType mime = mimeDb.mimeTypeForFile(info);
    if (mime.name().startsWith(QStringLiteral("image/"))) {
        m_hostMode = ImageViewer;
        setupImageViewer();
        syncUiState();
        logEmbedEvent(QStringLiteral("fallback_image"), m_filePath);
        emit statusMessage(QStringLiteral("Showing %1 in built-in image viewer.").arg(info.fileName()));
        return true;
    }
    if (mime.name().startsWith(QStringLiteral("text/"))
        || mime.inherits(QStringLiteral("text/plain"))) {
        m_hostMode = CodeViewer;
        setupCodeViewer();
        syncUiState();
        logEmbedEvent(QStringLiteral("fallback_code"), m_filePath);
        emit statusMessage(QStringLiteral("Showing %1 in built-in code viewer.").arg(info.fileName()));
        return true;
    }
#ifdef QT_MULTIMEDIA_LIB
    if (mime.name().startsWith(QStringLiteral("audio/"))
        || mime.name().startsWith(QStringLiteral("video/"))) {
        m_hostMode = MediaPlayer;
        setupMediaPlayer();
        syncUiState();
        logEmbedEvent(QStringLiteral("fallback_media"), m_filePath);
        emit statusMessage(QStringLiteral("Showing %1 in built-in media player.").arg(info.fileName()));
        return true;
    }
#endif
    if (ext == QStringLiteral("pdf")) {
#ifdef QT_PDF_LIB
        m_hostMode = PdfViewer;
        setupPdfViewer();
        syncUiState();
        logEmbedEvent(QStringLiteral("fallback_pdf"), m_filePath);
        emit statusMessage(QStringLiteral("Showing %1 in built-in PDF viewer.").arg(info.fileName()));
        return true;
#elif defined(QT_WEBENGINEWIDGETS_LIB)
        m_hostMode = WebView;
        setupWebView();
        syncUiState();
        logEmbedEvent(QStringLiteral("fallback_pdf"), m_filePath);
        emit statusMessage(QStringLiteral("Showing %1 in built-in PDF viewer.").arg(info.fileName()));
        return true;
#endif
    }

    showStateMessage(QStringLiteral("Associated app not embedded"),
                     QStringLiteral("Ixplorer could not capture %1 yet. Retry or open externally.")
                         .arg(info.fileName()));

    // Add "Retry embedding" button
    auto *retryBtn = new QPushButton(QStringLiteral("Retry embedding"), m_stateCard);
    retryBtn->setObjectName("DocumentGhostButton");
    retryBtn->setCursor(Qt::PointingHandCursor);
    connect(retryBtn, &QPushButton::clicked, this, [this]() {
        m_hostMode = WindowEmbed;
        showStateMessage(QStringLiteral("Retrying..."),
                         QStringLiteral("Attempting to capture the associated application again."));
        m_loadingTimer->start();
        QTimer::singleShot(50, this, [this]() {
            m_loadingTimer->stop();
            m_hostedReady = startHosting();
            if (!m_hostedReady) {
                showStateMessage(QStringLiteral("Embedding failed"),
                                 QStringLiteral("Could not capture the app window. Open externally instead."));
            }
            syncUiState();
        });
    });
    if (m_stateCard->layout()) {
        m_stateCard->layout()->addWidget(retryBtn);
    }

    emit statusMessage(QStringLiteral("Embedded capture failed for %1.").arg(info.fileName()));
    logEmbedEvent(QStringLiteral("fallback_state"), m_filePath);
    return false;
}

void DocumentPane::clearHostedSurface(bool terminateProcess) {
    if (m_hostMonitor) {
        m_hostMonitor->stop();
    }

    setHostedWindowVisible(false);

#ifdef Q_OS_WIN
    if (m_hostedWindowId != 0 && m_hostedWindowClaimed) {
        claimedHostedWindows().remove(m_hostedWindowId);
        m_hostedWindowClaimed = false;
    }

    if (m_hostedWindowId != 0 && IsWindow(reinterpret_cast<HWND>(m_hostedWindowId))) {
        HWND hwnd = reinterpret_cast<HWND>(m_hostedWindowId);
        SetParent(hwnd, reinterpret_cast<HWND>(m_originalWindowParent));
        if (m_originalWindowStyle != 0) {
            SetWindowLongPtrW(hwnd, GWL_STYLE, m_originalWindowStyle);
        }
        if (m_originalWindowExStyle != 0) {
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, m_originalWindowExStyle);
        }
        SetWindowPos(hwnd,
                     nullptr,
                     0,
                     0,
                     0,
                     0,
                     SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED | SWP_NOACTIVATE);
    }

    if (terminateProcess && (m_hostedWindowId != 0 || m_processHandle != 0)) {
        closeHostedWindow(m_hostedWindowId, m_processHandle, m_ownsHostedProcess);
    } else if (m_processHandle != 0) {
        CloseHandle(reinterpret_cast<HANDLE>(m_processHandle));
    }
#endif

    m_hostedWindowId = 0;
    m_processHandle = 0;
    m_ownsHostedProcess = false;
    m_originalWindowParent = 0;
    m_originalWindowStyle = 0;
    m_originalWindowExStyle = 0;
    m_hostedReady = false;
    m_backdropRefreshTick = 0;
    m_recoveryAttempts = 0;
    m_nextRecoveryAttemptMs = 0;
    m_hostedExecutable.clear();

    if (m_hostFrame) {
        m_hostFrame->hide();
    }
    if (m_hostSurface) {
        m_hostSurface->hide();
    }
    if (m_graphicsView) m_graphicsView->hide();
    if (m_codeViewer) m_codeViewer->hide();

#ifdef QT_WEBENGINEWIDGETS_LIB
    if (m_webView) m_webView->hide();
#endif

#ifdef QT_PDF_LIB
    if (m_pdfView) m_pdfView->hide();
    if (m_pdfDocument) m_pdfDocument->close();
#endif

#ifdef QT_MULTIMEDIA_LIB
    if (m_videoWidget) m_videoWidget->hide();
    if (m_mediaPlayer) m_mediaPlayer->stop();
#endif
    logEmbedEvent(QStringLiteral("host_clear"), m_filePath);
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

    HWND hwnd = reinterpret_cast<HWND>(m_hostedWindowId);
    const HWND hostHwnd = reinterpret_cast<HWND>(m_hostSurface->winId());
    if (hostHwnd && GetParent(hwnd) != hostHwnd) {
        SetParent(hwnd, hostHwnd);
    }

    const qreal dpr = m_hostSurface->devicePixelRatioF();
    const int targetWidth = qMax(1, static_cast<int>(m_hostSurface->width() * dpr));
    const int targetHeight = qMax(1, static_cast<int>(m_hostSurface->height() * dpr));
    SetWindowPos(hwnd,
                 nullptr,
                 0,
                 0,
                 targetWidth,
                 targetHeight,
                 SWP_NOZORDER | SWP_NOACTIVATE | SWP_NOCOPYBITS | SWP_FRAMECHANGED);
    RedrawWindow(hwnd, nullptr, nullptr, RDW_INVALIDATE | RDW_UPDATENOW | RDW_ALLCHILDREN);
#endif
}

void DocumentPane::handleHostedWindowHeartbeat() {
#ifdef Q_OS_WIN
    if (m_hostedWindowId == 0) {
        return;
    }

    if (!IsWindow(reinterpret_cast<HWND>(m_hostedWindowId))) {
        if (m_hostedWindowClaimed) {
            claimedHostedWindows().remove(m_hostedWindowId);
            m_hostedWindowClaimed = false;
        }
        const qint64 nowMs = QDateTime::currentMSecsSinceEpoch();
        if (nowMs < m_nextRecoveryAttemptMs) {
            return;
        }
        const bool launchedProcessStillAlive =
            m_processHandle != 0 &&
            WaitForSingleObject(reinterpret_cast<HANDLE>(m_processHandle), 0) == WAIT_TIMEOUT;
        if (tryRecoverHostedWindow()) {
            m_recoveryAttempts = 0;
            m_nextRecoveryAttemptMs = 0;
            updateHostedGeometry();
            return;
        }
        if (launchedProcessStillAlive) {
            m_recoveryAttempts += 1;
            const int exponent = qMin(5, m_recoveryAttempts);
            const qint64 backoffMs = static_cast<qint64>(250) << exponent;
            m_nextRecoveryAttemptMs = nowMs + qMin<qint64>(5000, backoffMs);
            if (m_recoveryAttempts % 4 == 0) {
                logEmbedEvent(QStringLiteral("recover_retry"), m_filePath, QJsonObject{
                    {QStringLiteral("attempt"), m_recoveryAttempts},
                    {QStringLiteral("next_retry_ms"), m_nextRecoveryAttemptMs},
                });
            }
            return;
        }

        if (m_processHandle != 0) {
            CloseHandle(reinterpret_cast<HANDLE>(m_processHandle));
        }
        m_hostedWindowId = 0;
        m_processHandle = 0;
        m_ownsHostedProcess = false;
        m_originalWindowParent = 0;
        m_originalWindowStyle = 0;
        m_originalWindowExStyle = 0;
        m_hostedReady = false;
        m_hostMonitor->stop();
        syncUiState();
        logEmbedEvent(QStringLiteral("host_lost"), m_filePath, QJsonObject{
            {QStringLiteral("attempts"), m_recoveryAttempts},
        });
        showStateMessage(QStringLiteral("Hosted app closed"),
                         QStringLiteral("The embedded app window was closed. Reload the tab to relaunch it here, or open it externally."));
        emit statusMessage(QStringLiteral("%1 was closed.").arg(QFileInfo(m_filePath).fileName()));
        return;
    }

    HWND hwnd = reinterpret_cast<HWND>(m_hostedWindowId);
    const HWND hostHwnd = m_hostSurface ? reinterpret_cast<HWND>(m_hostSurface->winId()) : nullptr;
    if (hostHwnd && GetParent(hwnd) != hostHwnd) {
        SetParent(hwnd, hostHwnd);
    }

    LONG_PTR currentStyle = GetWindowLongPtrW(hwnd, GWL_STYLE);
    if (!isUwpFrameWindow(hwnd) && ((currentStyle & WS_POPUP) || !(currentStyle & WS_CHILD))) {
        LONG_PTR hostedStyle = currentStyle;
        hostedStyle &= ~static_cast<LONG_PTR>(WS_POPUP);
        hostedStyle |= static_cast<LONG_PTR>(WS_CHILD);
        SetWindowLongPtrW(hwnd, GWL_STYLE, hostedStyle);
    }

    updateHostedGeometry();
    setHostedWindowVisible(isVisible());

    ++m_backdropRefreshTick;
    m_recoveryAttempts = 0;
    m_nextRecoveryAttemptMs = 0;
#endif
}

bool DocumentPane::tryRecoverHostedWindow() {
#ifndef Q_OS_WIN
    return false;
#else
    if (!m_hostSurface) {
        return false;
    }

    const QFileInfo info(m_filePath);
    const QString expectedExecutable = associatedExecutableBaseName(m_filePath);
    const QString executableLower = m_hostedExecutable.isEmpty() ? expectedExecutable : m_hostedExecutable;
    const HostingProfile profile = hostingProfileForExecutable(executableLower);
    
    DWORD processId = 0;
    if (m_processHandle != 0) {
        HANDLE handle = reinterpret_cast<HANDLE>(m_processHandle);
        if (WaitForSingleObject(handle, 0) == WAIT_TIMEOUT) {
            processId = GetProcessId(handle);
        }
    }

    const WindowCandidate chosen = findBestWindowCandidate(
        {},
        claimedHostedWindows(),
        m_hostedWindowId,
        info.fileName().toLower(),
        info.completeBaseName().toLower(),
        executableLower,
        processId);

    if (chosen.hwnd == nullptr || !IsWindow(chosen.hwnd)) {
        logEmbedEvent(QStringLiteral("recover_candidate_missing"), m_filePath, QJsonObject{
            {QStringLiteral("expected_executable"), executableLower},
            {QStringLiteral("process_id"), static_cast<qint64>(processId)},
        });
        return false;
    }

    const HWND hostHwnd = reinterpret_cast<HWND>(m_hostSurface->winId());
    if (!hostHwnd) {
        logEmbedEvent(QStringLiteral("recover_surface_missing"), m_filePath);
        return false;
    }

    m_originalWindowParent = reinterpret_cast<quintptr>(GetParent(chosen.hwnd));
    m_originalWindowStyle = GetWindowLongPtrW(chosen.hwnd, GWL_STYLE);
    m_originalWindowExStyle = GetWindowLongPtrW(chosen.hwnd, GWL_EXSTYLE);

    ShowWindow(chosen.hwnd, SW_HIDE);
    if (profile.mutateWindowStyle && !isUwpFrameWindow(chosen.hwnd)) {
        LONG_PTR hostedStyle = m_originalWindowStyle;
        hostedStyle &= ~static_cast<LONG_PTR>(WS_POPUP);
        hostedStyle |= static_cast<LONG_PTR>(WS_CHILD);
        SetWindowLongPtrW(chosen.hwnd, GWL_STYLE, hostedStyle);
    }
    SetParent(chosen.hwnd, hostHwnd);
    {
        const qreal dpr = m_hostSurface->devicePixelRatioF();
        const int w = qMax(1, static_cast<int>(m_hostSurface->width() * dpr));
        const int h = qMax(1, static_cast<int>(m_hostSurface->height() * dpr));
        MoveWindow(chosen.hwnd, 0, 0, w, h, TRUE);
    }
    RedrawWindow(chosen.hwnd, nullptr, nullptr, RDW_INVALIDATE | RDW_UPDATENOW | RDW_ALLCHILDREN);
    m_hostedWindowId = reinterpret_cast<WId>(chosen.hwnd);
    claimedHostedWindows().insert(m_hostedWindowId);
    m_hostedWindowClaimed = true;
    m_hostedReady = true;
    if (m_hostFrame) {
        m_hostFrame->show();
    }
    m_hostSurface->show();
    m_stateCard->hide();
    setHostedWindowVisible(isVisible());
    refreshHostedBackdrop();
    m_hostedExecutable = executableLower;
    if (m_hostMonitor != nullptr) {
        m_hostMonitor->setInterval(profile.heartbeatIntervalMs);
    }
    logEmbedEvent(QStringLiteral("recover_ok"), m_filePath, QJsonObject{
        {QStringLiteral("expected_executable"), executableLower},
        {QStringLiteral("score"), chosen.score},
    });
    emit statusMessage(QStringLiteral("Recovered hosted window for %1.")
                           .arg(info.fileName()));
    return true;
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
    
    QColor sysBg = QGuiApplication::palette().window().color();
    bool isDark = sysBg.lightness() < 128;
    QColor baseBg = isDark ? QColor(10, 10, 12) : QColor(245, 245, 247);
    
    auto blend = [](const QColor &c1, const QColor &c2, double alpha) {
        return QColor(
            c1.red() * (1 - alpha) + c2.red() * alpha,
            c1.green() * (1 - alpha) + c2.green() * alpha,
            c1.blue() * (1 - alpha) + c2.blue() * alpha
        );
    };
    
    QColor frameBgTop = blend(baseBg, color, 0.34);
    QColor frameBgBot = blend(baseBg, color, 0.14);
    QColor shellEdge = blend(baseBg, color, 0.11);
    QColor frameOuter = blend(baseBg, color, 0.22);
    QColor frameInner = blend(baseBg, color, 0.30);

    m_contentRoot->setStyleSheet(QStringLiteral(
        "QWidget#DocumentHostRoot {"
        " background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 %1, stop:0.62 %2, stop:1 %3);"
        " border: 1px solid %4;"
        " border-radius: 12px;"
        " padding: 10px;"
        "}"
        "QWidget#HostedWindowFrame {"
        " background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 %5, stop:1 %6);"
        " border: 1px solid rgba(255,255,255,0.10);"
        " border-radius: 10px;"
        "}"
        "QWidget#HostedWindowSurface {"
        " background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 rgba(255,255,255,0.07), stop:0.38 rgba(255,255,255,0.03), stop:1 rgba(0,0,0,0.12));"
        " border-radius: 9px;"
        "}")
                                   .arg(frameBgTop.name(QColor::HexRgb),
                                        frameBgBot.name(QColor::HexRgb),
                                        baseBg.name(QColor::HexRgb),
                                        shellEdge.name(QColor::HexRgb),
                                        frameOuter.name(QColor::HexRgb),
                                        frameInner.name(QColor::HexRgb)));
}

void DocumentPane::setupImageViewer() {
    QPixmap pixmap(m_filePath);
    if (pixmap.isNull()) {
        m_hostMode = Fallback;
        m_hostedReady = false;
        return;
    }
    m_graphicsScene->clear();
    m_pixmapItem = m_graphicsScene->addPixmap(pixmap);
    m_graphicsScene->setSceneRect(pixmap.rect());
    m_graphicsView->fitInView(m_graphicsScene->sceneRect(), Qt::KeepAspectRatio);
    m_graphicsView->show();
    m_stateCard->hide();
    if (m_hostFrame) m_hostFrame->hide();
    m_hostSurface->hide();
    if (m_codeViewer) m_codeViewer->hide();
#ifdef QT_PDF_LIB
    if (m_pdfView) m_pdfView->hide();
#endif
    applyHostedBackdrop(QColor(28, 30, 34));
}

void DocumentPane::setupCodeViewer() {
    QFile file(m_filePath);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        m_hostMode = Fallback;
        m_hostedReady = false;
        return;
    }
    QByteArray data = file.read(64 * 1024);
    m_codeViewer->setPlainText(QString::fromUtf8(data));
    m_codeViewer->show();
    m_stateCard->hide();
    if (m_hostFrame) m_hostFrame->hide();
    m_hostSurface->hide();
    if (m_graphicsView) m_graphicsView->hide();
#ifdef QT_PDF_LIB
    if (m_pdfView) m_pdfView->hide();
#endif
    applyHostedBackdrop(QColor(20, 22, 26));
}

void DocumentPane::setupPdfViewer() {
#ifdef QT_PDF_LIB
    if (!m_pdfDocument || !m_pdfView) {
        m_hostMode = Fallback;
        m_hostedReady = false;
        return;
    }
    if (m_pdfDocument->load(m_filePath) != QPdfDocument::NoError) {
        m_hostMode = WindowEmbed;
        m_hostedReady = false;
        return;
    }
    m_pdfView->show();
    m_stateCard->hide();
    if (m_hostFrame) m_hostFrame->hide();
    m_hostSurface->hide();
    if (m_graphicsView) m_graphicsView->hide();
    if (m_codeViewer) m_codeViewer->hide();
#ifdef QT_WEBENGINEWIDGETS_LIB
    if (m_webView) m_webView->hide();
#endif
#ifdef QT_MULTIMEDIA_LIB
    if (m_videoWidget) m_videoWidget->hide();
#endif
    applyHostedBackdrop(QColor(24, 26, 30));
#endif
}

void DocumentPane::setupWebView() {
#ifdef QT_WEBENGINEWIDGETS_LIB
    m_webView->setUrl(QUrl::fromLocalFile(m_filePath));
    m_webView->show();
    m_stateCard->hide();
    if (m_hostFrame) m_hostFrame->hide();
    m_hostSurface->hide();
    if (m_graphicsView) m_graphicsView->hide();
    if (m_codeViewer) m_codeViewer->hide();
#ifdef QT_PDF_LIB
    if (m_pdfView) m_pdfView->hide();
#endif
    applyHostedBackdrop(QColor(28, 30, 34));
#endif
}

void DocumentPane::setupMediaPlayer() {
#ifdef QT_MULTIMEDIA_LIB
    if (!m_mediaPlayer) {
        m_mediaPlayer = new QMediaPlayer(this);
        m_audioOutput = new QAudioOutput(this);
        m_mediaPlayer->setAudioOutput(m_audioOutput);
        m_mediaPlayer->setVideoOutput(m_videoWidget);
    }
    m_mediaPlayer->setSource(QUrl::fromLocalFile(m_filePath));
    m_videoWidget->show();
    m_stateCard->hide();
    if (m_hostFrame) m_hostFrame->hide();
    m_hostSurface->hide();
    if (m_graphicsView) m_graphicsView->hide();
    if (m_codeViewer) m_codeViewer->hide();
#ifdef QT_PDF_LIB
    if (m_pdfView) m_pdfView->hide();
#endif
    m_mediaPlayer->play();
    applyHostedBackdrop(QColor(20, 22, 26));
#endif
}

void DocumentPane::setupOfficeEmbed() {
#if defined(Q_OS_WIN) && defined(QT_AXCONTAINER_LIB)
    const QString ext = QFileInfo(m_filePath).suffix().toLower();
    QString progId;
    if (ext == QStringLiteral("docx") || ext == QStringLiteral("doc")) {
        progId = QStringLiteral("Word.Document");
    } else if (ext == QStringLiteral("xlsx") || ext == QStringLiteral("xls")) {
        progId = QStringLiteral("Excel.Sheet");
    } else if (ext == QStringLiteral("pptx") || ext == QStringLiteral("ppt")) {
        progId = QStringLiteral("PowerPoint.Show");
    }
    if (!progId.isEmpty()) {
        if (!m_axWidget) {
            m_axWidget = new QAxWidget(m_contentRoot);
            if (m_contentLayout) {
                m_contentLayout->addWidget(m_axWidget, 1);
            }
        }
        m_axWidget->setControl(progId);
        m_axWidget->dynamicCall("Open(QString)", m_filePath);
        m_axWidget->show();
        m_stateCard->hide();
        if (m_hostFrame) m_hostFrame->hide();
        m_hostSurface->hide();
        if (m_graphicsView) m_graphicsView->hide();
        if (m_codeViewer) m_codeViewer->hide();
        return;
    }
#endif
    // Office not installed or AxContainer unavailable — fall back to WindowEmbed
    m_hostMode = WindowEmbed;
    if (m_launchDeferred) {
        showStateMessage(QStringLiteral("Click to reopen"),
                         QStringLiteral("Click to launch the associated application for %1.")
                             .arg(QFileInfo(m_filePath).fileName()));
    } else {
        showStateMessage(QStringLiteral("Opening..."),
                         QStringLiteral("Launching the associated application for %1.")
                             .arg(QFileInfo(m_filePath).fileName()));
        m_loadingTimer->start();
        QTimer::singleShot(50, this, [this]() {
            m_loadingTimer->stop();
            m_hostedReady = startHosting();
            if (!m_hostedReady) {
                setupHostFailureFallback();
            }
            syncUiState();
        });
    }
}

void DocumentPane::showStateMessage(const QString &title, const QString &body) {
    if (m_hostFrame) {
        m_hostFrame->hide();
    }
    if (m_hostSurface) {
        m_hostSurface->hide();
    }
    if (m_graphicsView) m_graphicsView->hide();
    if (m_codeViewer) m_codeViewer->hide();
#ifdef QT_PDF_LIB
    if (m_pdfView) m_pdfView->hide();
#endif

#ifdef QT_WEBENGINEWIDGETS_LIB
    if (m_webView) m_webView->hide();
#endif

#ifdef QT_MULTIMEDIA_LIB
    if (m_videoWidget) m_videoWidget->hide();
    if (m_mediaPlayer) m_mediaPlayer->stop();
#endif

#if defined(Q_OS_WIN) && defined(QT_AXCONTAINER_LIB)
    if (m_axWidget) m_axWidget->hide();
#endif

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
        if (m_hostFrame) {
            m_hostFrame->show();
        }
        if (m_hostSurface) {
            m_hostSurface->show();
        }
        m_stateCard->hide();
        return;
    }

    if (m_hostMode == ImageViewer || m_hostMode == CodeViewer || m_hostMode == WebView || m_hostMode == MediaPlayer || m_hostMode == PdfViewer) {
        if (m_hostFrame) {
            m_hostFrame->hide();
        }
        m_stateCard->hide();
        return;
    }

    if (m_policy.usesHostedWindow()) {
        showStateMessage(
            QStringLiteral("Associated app not embedded"),
            QStringLiteral("Ixplorer kept this tab in-app, but the associated window has not been captured yet."));
    } else {
        showStateMessage(m_policy.summary, m_policy.detail);
    }
}

bool DocumentPane::eventFilter(QObject *watched, QEvent *event) {
    if (watched == m_hostSurface &&
        (event->type() == QEvent::MouseButtonPress || event->type() == QEvent::FocusIn)) {
#ifdef Q_OS_WIN
        if (m_hostedWindowId != 0 && IsWindow(reinterpret_cast<HWND>(m_hostedWindowId))) {
            SetActiveWindow(reinterpret_cast<HWND>(m_hostedWindowId));
            SetFocus(reinterpret_cast<HWND>(m_hostedWindowId));
            SetForegroundWindow(reinterpret_cast<HWND>(m_hostedWindowId));
        }
#endif
    }

    // Mouse wheel zoom for image viewer
    if (watched == m_graphicsView && event->type() == QEvent::Wheel && m_hostMode == ImageViewer) {
        auto *wheelEvent = static_cast<QWheelEvent *>(event);
        const qreal factor = wheelEvent->angleDelta().y() > 0 ? 1.15 : 1.0 / 1.15;
        m_graphicsView->scale(factor, factor);
        return true;
    }

    return QWidget::eventFilter(watched, event);
}

} // namespace Ixplorer
