#include "widgets/ExplorerPane.h"
#include "models/FileSystemProxyModel.h"
#include "utils/FileOperations.h"
#include "theme/ThemedFileIconProvider.h"

#include <QApplication>
#include <QClipboard>
#include <QDir>
#include <QFile>
#include <QHeaderView>
#include <QMenu>
#include <QMessageBox>
#include <QMimeData>
#include <QProcess>
#include <QShortcut>
#include <QTimer>
#include <QUrl>
#include <QVBoxLayout>

namespace Ixplorer {

namespace {

struct PendingClipboard {
    QStringList paths;
    ExplorerPane::ClipboardOperation operation = ExplorerPane::ClipboardOperation::Copy;
};

PendingClipboard &pendingClipboard() {
    static PendingClipboard state;
    return state;
}

QString propertiesText(const QFileInfo &info, int selectedCount, quint64 selectedBytes) {
    if (selectedCount <= 1) {
        return QString("Name: %1\nLocation: %2\nType: %3\nSize: %4\nModified: %5")
            .arg(info.fileName(),
                 QDir::toNativeSeparators(info.absolutePath()),
                 info.isDir() ? "Folder" : (info.suffix().isEmpty() ? "File" : info.suffix().toUpper() + " file"),
                 info.isDir() ? QString("Folder") : QLocale().formattedDataSize(info.size()),
                 info.lastModified().toString("yyyy-MM-dd hh:mm"));
    }

    return QString("%1 items selected\nTotal size: %2")
        .arg(selectedCount)
        .arg(QLocale().formattedDataSize(selectedBytes));
}

void openWithDialog(const QString &path) {
#ifdef Q_OS_WIN
    QProcess::startDetached(
        "rundll32.exe",
        {"shell32.dll,OpenAs_RunDLL", QDir::toNativeSeparators(path)});
#else
    openPath(path);
#endif
}

void revealInExplorer(const QString &path) {
#ifdef Q_OS_WIN
    QProcess::startDetached("explorer", {"/select,", QDir::toNativeSeparators(path)});
#elif defined(Q_OS_MACOS)
    QProcess::startDetached("open", {"-R", path});
#else
    QProcess::startDetached("xdg-open", {QFileInfo(path).absolutePath()});
#endif
}

} // namespace

ExplorerPane::ExplorerPane(const QString &rootPath, QWidget *parent)
    : QWidget(parent)
    , m_tree(new QTreeView(this))
    , m_fsModel(new QFileSystemModel(this))
    , m_proxyModel(new FileSystemProxyModel(this)) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);
    layout->addWidget(m_tree);

    m_fsModel->setRootPath(rootPath);
    m_fsModel->setFilter(QDir::AllEntries | QDir::NoDotAndDotDot | QDir::Hidden | QDir::System);
    m_fsModel->setNameFilterDisables(false);
    m_fsModel->setReadOnly(false);
    m_fsModel->setIconProvider(new ThemedFileIconProvider());

    m_proxyModel->setSourceModel(m_fsModel);
    m_proxyModel->setSortRole(QFileSystemModel::FileNameRole);

    m_tree->setModel(m_proxyModel);
    m_tree->setRootIsDecorated(false);
    m_tree->setItemsExpandable(false);
    m_tree->setUniformRowHeights(true);
    m_tree->setSortingEnabled(true);
    m_tree->sortByColumn(0, Qt::AscendingOrder);
    m_tree->setSelectionMode(QAbstractItemView::ExtendedSelection);
    m_tree->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_tree->setAlternatingRowColors(true);
    m_tree->setEditTriggers(QAbstractItemView::EditKeyPressed | QAbstractItemView::SelectedClicked);
    m_tree->setIndentation(12);
    m_tree->setDragEnabled(true);
    m_tree->setAcceptDrops(true);
    m_tree->setDropIndicatorShown(true);
    m_tree->setDragDropMode(QAbstractItemView::DragDrop);
    m_tree->setDefaultDropAction(Qt::MoveAction);

    auto *header = m_tree->header();
    header->setSortIndicatorShown(true);
    header->setSectionsClickable(true);
    header->setStretchLastSection(false);
    header->setSectionResizeMode(0, QHeaderView::Stretch);
    header->resizeSection(1, 180);
    header->resizeSection(2, 120);
    header->resizeSection(3, 90);

    m_tree->setContextMenuPolicy(Qt::CustomContextMenu);
    connect(m_tree, &QTreeView::customContextMenuRequested, this, &ExplorerPane::showContextMenu);
    connect(m_tree, &QTreeView::doubleClicked, this, &ExplorerPane::onDoubleClicked);
    connect(m_tree->selectionModel(), &QItemSelectionModel::selectionChanged, this, &ExplorerPane::onSelectionChanged);
    connect(m_fsModel, &QFileSystemModel::directoryLoaded, this, &ExplorerPane::onModelLoaded);

    auto *renameKey = new QShortcut(QKeySequence(Qt::Key_F2), m_tree);
    connect(renameKey, &QShortcut::activated, this, &ExplorerPane::renameSelected);

    auto *deleteKey = new QShortcut(QKeySequence(Qt::Key_Delete), m_tree);
    connect(deleteKey, &QShortcut::activated, this, &ExplorerPane::deleteSelected);

    auto *enterKey = new QShortcut(QKeySequence(Qt::Key_Return), m_tree);
    connect(enterKey, &QShortcut::activated, this, &ExplorerPane::openSelected);
    auto *enterNumpadKey = new QShortcut(QKeySequence(Qt::Key_Enter), m_tree);
    connect(enterNumpadKey, &QShortcut::activated, this, &ExplorerPane::openSelected);

    auto *copyKey = new QShortcut(QKeySequence::Copy, m_tree);
    connect(copyKey, &QShortcut::activated, this, &ExplorerPane::copySelected);

    auto *cutKey = new QShortcut(QKeySequence::Cut, m_tree);
    connect(cutKey, &QShortcut::activated, this, &ExplorerPane::cutSelected);

    auto *pasteKey = new QShortcut(QKeySequence::Paste, m_tree);
    connect(pasteKey, &QShortcut::activated, this, &ExplorerPane::pasteIntoCurrentDirectory);

    auto *duplicateKey = new QShortcut(QKeySequence("Ctrl+D"), m_tree);
    connect(duplicateKey, &QShortcut::activated, this, &ExplorerPane::duplicateSelected);

    auto *propertiesKey = new QShortcut(QKeySequence("Alt+Return"), m_tree);
    connect(propertiesKey, &QShortcut::activated, this, &ExplorerPane::showProperties);

    auto *newFolderKey = new QShortcut(QKeySequence("Ctrl+Shift+N"), m_tree);
    connect(newFolderKey, &QShortcut::activated, this, &ExplorerPane::createNewFolder);

    auto *selectAllKey = new QShortcut(QKeySequence::SelectAll, m_tree);
    connect(selectAllKey, &QShortcut::activated, m_tree, [this]() {
        m_tree->selectAll();
        onSelectionChanged();
    });

    auto *goUpKey = new QShortcut(QKeySequence(Qt::Key_Backspace), m_tree);
    connect(goUpKey, &QShortcut::activated, this, &ExplorerPane::goUp);

    setPath(rootPath);
    configureViewMode();
}

void ExplorerPane::setPath(const QString &path) {
    navigateTo(path, true);
}

void ExplorerPane::refresh() {
    m_fsModel->setRootPath(QString());
    navigateTo(m_currentPath, false);
}

int ExplorerPane::itemCount() const {
    return m_proxyModel->rowCount(m_tree->rootIndex());
}

bool ExplorerPane::canGoBack() const {
    return m_historyIndex > 0;
}

bool ExplorerPane::canGoForward() const {
    return m_historyIndex >= 0 && m_historyIndex < m_history.size() - 1;
}

bool ExplorerPane::canGoUp() const {
    QDir dir(QDir::fromNativeSeparators(m_currentPath));
    return dir.cdUp();
}

void ExplorerPane::goBack() {
    if (!canGoBack()) {
        return;
    }

    m_updatingHistory = true;
    --m_historyIndex;
    navigateTo(m_history.at(m_historyIndex), false);
    m_updatingHistory = false;
}

void ExplorerPane::goForward() {
    if (!canGoForward()) {
        return;
    }

    m_updatingHistory = true;
    ++m_historyIndex;
    navigateTo(m_history.at(m_historyIndex), false);
    m_updatingHistory = false;
}

void ExplorerPane::goUp() {
    QDir dir(QDir::fromNativeSeparators(m_currentPath));
    if (dir.cdUp()) {
        navigateTo(dir.absolutePath(), true);
    }
}

void ExplorerPane::setFilterText(const QString &text) {
    m_proxyModel->setNameFilter(text.trimmed());
}

QStringList ExplorerPane::selectedPaths() const {
    QStringList paths;
    const QModelIndexList selected = m_tree->selectionModel()->selectedRows();
    for (const QModelIndex &index : selected) {
        const QModelIndex sourceIndex = m_proxyModel->mapToSource(index);
        paths.push_back(m_fsModel->filePath(sourceIndex));
    }
    return paths;
}

void ExplorerPane::selectPath(const QString &path) {
    const QFileInfo info(path);
    if (!info.exists()) {
        return;
    }

    const QString parentPath = info.isDir() ? info.absoluteFilePath() : info.absolutePath();
    if (parentPath.compare(m_currentPath, Qt::CaseInsensitive) != 0) {
        navigateTo(parentPath, true);
    }

    const QModelIndex sourceIndex = m_fsModel->index(info.absoluteFilePath());
    if (!sourceIndex.isValid()) {
        return;
    }

    const QModelIndex proxyIndex = m_proxyModel->mapFromSource(sourceIndex);
    if (!proxyIndex.isValid()) {
        return;
    }

    m_tree->selectionModel()->clearSelection();
    m_tree->setCurrentIndex(proxyIndex);
    m_tree->selectionModel()->select(
        proxyIndex,
        QItemSelectionModel::Select | QItemSelectionModel::Rows | QItemSelectionModel::Clear);
    m_tree->scrollTo(proxyIndex, QAbstractItemView::PositionAtCenter);
    onSelectionChanged();
}

void ExplorerPane::openSelected() {
    const QFileInfo info = currentInfo();
    if (!info.exists()) {
        return;
    }

    if (info.isDir()) {
        navigateTo(info.absoluteFilePath(), true);
        return;
    }

    emit fileActivated(info);
}

void ExplorerPane::openSelectedWith() {
    const QFileInfo info = currentInfo();
    if (info.exists() && !info.isDir()) {
        openWithDialog(info.absoluteFilePath());
    }
}

void ExplorerPane::revealSelected() {
    const QFileInfo info = currentInfo();
    if (info.exists()) {
        revealInExplorer(info.absoluteFilePath());
    }
}

void ExplorerPane::renameSelected() {
    const QModelIndex current = m_tree->currentIndex();
    if (!current.isValid()) {
        return;
    }

    const QModelIndex nameIndex = m_proxyModel->index(current.row(), 0, current.parent());
    m_tree->edit(nameIndex);
}

void ExplorerPane::deleteSelected() {
    const QStringList paths = selectedPaths();
    if (paths.isEmpty()) {
        return;
    }

    const QString confirmationMessage = paths.size() == 1
        ? QString("Move \"%1\" to the Recycle Bin?").arg(QFileInfo(paths.first()).fileName())
        : QString("Move %1 items to the Recycle Bin?").arg(paths.size());

    if (QMessageBox::question(this, "Delete", confirmationMessage) != QMessageBox::Yes) {
        return;
    }

    int moved = 0;
    int failed = 0;
    for (const QString &path : paths) {
        if (QFile::moveToTrash(path)) {
            ++moved;
        } else {
            ++failed;
        }
    }

    refresh();
    QString message = QString("Moved %1 item%2 to the Recycle Bin.")
                          .arg(moved)
                          .arg(moved == 1 ? QString() : QString("s"));
    if (failed > 0) {
        message += QString(" %1 failed.").arg(failed);
    }
    emit statusMessage(message);
}

void ExplorerPane::createNewFolder() {
    const QModelIndex rootSource = m_proxyModel->mapToSource(m_tree->rootIndex());
    const QString uniquePath = FileOperations::uniquePathForName(m_currentPath, "New Folder");
    const QString folderName = QFileInfo(uniquePath).fileName();
    const QModelIndex newDirectory = m_fsModel->mkdir(rootSource, folderName);
    if (!newDirectory.isValid()) {
        emit statusMessage("Unable to create folder here.");
        return;
    }

    const QModelIndex proxyIndex = m_proxyModel->mapFromSource(newDirectory);
    m_tree->setCurrentIndex(proxyIndex);
    m_tree->scrollTo(proxyIndex);
    m_tree->edit(proxyIndex);
}

void ExplorerPane::createNewTextFile() {
    const QString uniquePath = FileOperations::uniquePathForName(m_currentPath, "New Text Document.txt");
    QFile file(uniquePath);
    if (!file.open(QIODevice::WriteOnly)) {
        emit statusMessage("Unable to create a new text file here.");
        return;
    }
    file.close();

    refresh();
    selectPath(uniquePath);
    renameSelected();
    emit statusMessage("Created a new text file.");
}

void ExplorerPane::copySelected() {
    applyClipboard(ClipboardOperation::Copy);
}

void ExplorerPane::cutSelected() {
    applyClipboard(ClipboardOperation::Cut);
}

void ExplorerPane::pasteIntoCurrentDirectory() {
    PendingClipboard &clipboard = pendingClipboard();
    if (clipboard.paths.isEmpty()) {
        return;
    }

    int changed = 0;
    for (const QString &path : clipboard.paths) {
        const QFileInfo info(path);
        const QString destination = FileOperations::uniquePathForName(m_currentPath, info.fileName());

        if (QFileInfo(destination).absoluteFilePath() == info.absoluteFilePath()) {
            continue;
        }

        QString error;
        const bool ok = clipboard.operation == ClipboardOperation::Copy
            ? FileOperations::copyRecursively(info.absoluteFilePath(), destination, &error)
            : FileOperations::moveRecursively(info.absoluteFilePath(), destination, &error);

        if (ok) {
            ++changed;
        } else if (!error.isEmpty()) {
            emit statusMessage(error);
        }
    }

    if (clipboard.operation == ClipboardOperation::Cut) {
        clipboard.paths.clear();
    }

    refresh();
    emit statusMessage(QString("%1 item%2 pasted into %3.")
                           .arg(changed)
                           .arg(changed == 1 ? QString() : QString("s"))
                           .arg(QDir::toNativeSeparators(m_currentPath)));
}

void ExplorerPane::duplicateSelected() {
    const QStringList paths = selectedPaths();
    if (paths.isEmpty()) {
        return;
    }

    int duplicated = 0;
    for (const QString &path : paths) {
        const QFileInfo info(path);
        QString error;
        if (FileOperations::copyRecursively(
                info.absoluteFilePath(),
                FileOperations::duplicateTargetPath(info),
                &error)) {
            ++duplicated;
        } else if (!error.isEmpty()) {
            emit statusMessage(error);
        }
    }

    refresh();
    emit statusMessage(QString("Created %1 duplicate%2.")
                           .arg(duplicated)
                           .arg(duplicated == 1 ? QString() : QString("s")));
}

void ExplorerPane::showProperties() {
    const QModelIndexList selected = m_tree->selectionModel()->selectedRows();
    if (selected.isEmpty()) {
        return;
    }

    quint64 selectedBytes = 0;
    for (const QModelIndex &index : selected) {
        const QFileInfo info = m_fsModel->fileInfo(m_proxyModel->mapToSource(index));
        if (info.isFile()) {
            selectedBytes += static_cast<quint64>(info.size());
        }
    }

    const QFileInfo info = currentInfo();
    QMessageBox::information(this, "Properties", propertiesText(info, selected.size(), selectedBytes));
}

void ExplorerPane::copyNameSelected() {
    const QFileInfo info = currentInfo();
    if (!info.exists()) {
        return;
    }

    QApplication::clipboard()->setText(info.fileName());
    emit statusMessage(QString("Copied \"%1\".").arg(info.fileName()));
}

void ExplorerPane::copyPathSelected() {
    const QFileInfo info = currentInfo();
    if (!info.exists()) {
        return;
    }

    QApplication::clipboard()->setText(QDir::toNativeSeparators(info.absoluteFilePath()));
    emit statusMessage("Copied path.");
}

void ExplorerPane::setViewMode(ViewMode mode) {
    if (m_viewMode == mode) {
        return;
    }
    m_viewMode = mode;
    configureViewMode();
    emit statusMessage(m_viewMode == ViewMode::Details
                           ? "Details view enabled."
                           : "List view enabled.");
}

void ExplorerPane::onDoubleClicked(const QModelIndex &index) {
    const QFileInfo info = m_fsModel->fileInfo(m_proxyModel->mapToSource(index));
    if (info.isDir()) {
        navigateTo(info.absoluteFilePath(), true);
    } else {
        emit fileActivated(info);
    }
}

void ExplorerPane::onSelectionChanged() {
    const QModelIndexList selected = m_tree->selectionModel()->selectedRows();
    if (selected.isEmpty()) {
        emit selectionCleared();
        return;
    }

    quint64 selectedBytes = 0;
    for (const QModelIndex &index : selected) {
        const QFileInfo info = m_fsModel->fileInfo(m_proxyModel->mapToSource(index));
        if (info.isFile()) {
            selectedBytes += static_cast<quint64>(info.size());
        }
    }

    emit selectionChanged(currentInfo(), selected.size(), selectedBytes);
}

void ExplorerPane::onModelLoaded() {
    emit pathChanged(m_currentPath);
    updateNavigationState();
}

void ExplorerPane::showContextMenu(const QPoint &pos) {
    QMenu menu(m_tree);
    QAction *pasteAction = menu.addAction("Paste");
    pasteAction->setEnabled(!pendingClipboard().paths.isEmpty());
    connect(pasteAction, &QAction::triggered, this, &ExplorerPane::pasteIntoCurrentDirectory);

    QMenu *newMenu = menu.addMenu("New");
    QAction *newFolderAction = newMenu->addAction("Folder");
    connect(newFolderAction, &QAction::triggered, this, &ExplorerPane::createNewFolder);
    QAction *newTextFileAction = newMenu->addAction("Text Document");
    connect(newTextFileAction, &QAction::triggered, this, &ExplorerPane::createNewTextFile);

    menu.addSeparator();

    const QFileInfo info = currentInfo();
    if (info.exists()) {
        QAction *openAction = menu.addAction("Open");
        connect(openAction, &QAction::triggered, this, &ExplorerPane::openSelected);

        if (!info.isDir()) {
            QAction *openWithAction = menu.addAction("Open with...");
            connect(openWithAction, &QAction::triggered, this, &ExplorerPane::openSelectedWith);
        }

        QAction *newTabAction = menu.addAction("Open in New Tab");
        connect(newTabAction, &QAction::triggered, this, [this, info]() {
            emit openInNewTabRequested(info.absoluteFilePath());
        });

        menu.addSeparator();

        QAction *copyAction = menu.addAction("Copy");
        connect(copyAction, &QAction::triggered, this, &ExplorerPane::copySelected);

        QAction *cutAction = menu.addAction("Cut");
        connect(cutAction, &QAction::triggered, this, &ExplorerPane::cutSelected);

        QAction *duplicateAction = menu.addAction("Duplicate");
        connect(duplicateAction, &QAction::triggered, this, &ExplorerPane::duplicateSelected);

        menu.addSeparator();

        QAction *copyNameAction = menu.addAction("Copy Name");
        connect(copyNameAction, &QAction::triggered, this, &ExplorerPane::copyNameSelected);

        QAction *copyPathAction = menu.addAction("Copy Path");
        connect(copyPathAction, &QAction::triggered, this, &ExplorerPane::copyPathSelected);

        QAction *revealAction = menu.addAction("Reveal in Explorer");
        connect(revealAction, &QAction::triggered, this, &ExplorerPane::revealSelected);

        menu.addSeparator();

        QAction *renameAction = menu.addAction("Rename");
        connect(renameAction, &QAction::triggered, this, &ExplorerPane::renameSelected);

        QAction *deleteAction = menu.addAction("Delete");
        connect(deleteAction, &QAction::triggered, this, &ExplorerPane::deleteSelected);

        QAction *propertiesAction = menu.addAction("Properties");
        connect(propertiesAction, &QAction::triggered, this, &ExplorerPane::showProperties);

        menu.addSeparator();
    }

    QAction *refreshAction = menu.addAction("Refresh");
    connect(refreshAction, &QAction::triggered, this, &ExplorerPane::refresh);

    menu.addSeparator();

    QMenu *viewMenu = menu.addMenu("View");
    QAction *detailsAction = viewMenu->addAction("Details");
    detailsAction->setCheckable(true);
    detailsAction->setChecked(m_viewMode == ViewMode::Details);
    connect(detailsAction, &QAction::triggered, this, [this]() { setViewMode(ViewMode::Details); });

    QAction *listAction = viewMenu->addAction("List");
    listAction->setCheckable(true);
    listAction->setChecked(m_viewMode == ViewMode::List);
    connect(listAction, &QAction::triggered, this, [this]() { setViewMode(ViewMode::List); });

    showSortMenu(menu);
    menu.exec(m_tree->viewport()->mapToGlobal(pos));
}

void ExplorerPane::navigateTo(const QString &path, bool recordHistory) {
    QDir dir(QDir::fromNativeSeparators(path));
    if (!dir.exists()) {
        return;
    }

    const QString normalized = QDir::toNativeSeparators(dir.absolutePath());
    if (normalized == m_currentPath && !m_tree->rootIndex().isValid()) {
        return;
    }

    m_currentPath = normalized;

    const QModelIndex sourceIndex = m_fsModel->setRootPath(QDir::fromNativeSeparators(normalized));
    m_tree->setRootIndex(m_proxyModel->mapFromSource(sourceIndex));

    if (recordHistory && !m_updatingHistory) {
        if (m_historyIndex >= 0 && m_historyIndex < m_history.size() && m_history.at(m_historyIndex) == normalized) {
            updateNavigationState();
        } else {
            if (m_historyIndex < m_history.size() - 1) {
                m_history = m_history.mid(0, m_historyIndex + 1);
            }
            m_history.push_back(normalized);
            m_historyIndex = m_history.size() - 1;
        }
    }

    emit pathChanged(m_currentPath);
    updateNavigationState();
    QTimer::singleShot(0, this, [this]() { m_tree->setFocus(); });
}

QFileInfo ExplorerPane::currentInfo() const {
    const QModelIndex current = m_tree->currentIndex();
    if (!current.isValid()) {
        return QFileInfo();
    }
    return m_fsModel->fileInfo(m_proxyModel->mapToSource(current));
}

void ExplorerPane::updateNavigationState() {
    emit navigationStateChanged(canGoBack(), canGoForward(), canGoUp());
}

void ExplorerPane::configureViewMode() {
    const bool details = m_viewMode == ViewMode::Details;
    m_tree->header()->setVisible(details);
    m_tree->setColumnHidden(1, !details);
    m_tree->setColumnHidden(2, !details);
    m_tree->setColumnHidden(3, !details);
    m_tree->setItemsExpandable(details);
    m_tree->setRootIsDecorated(false);
}

void ExplorerPane::showSortMenu(QMenu &menu) {
    QMenu *sortMenu = menu.addMenu("Sort by");
    const struct {
        const char *label;
        int column;
    } options[] = {{"Name", 0}, {"Date modified", 1}, {"Type", 2}, {"Size", 3}};

    for (const auto &option : options) {
        QAction *action = sortMenu->addAction(option.label);
        connect(action, &QAction::triggered, this, [this, option]() {
            const Qt::SortOrder nextOrder =
                m_tree->header()->sortIndicatorSection() == option.column
                        && m_tree->header()->sortIndicatorOrder() == Qt::AscendingOrder
                    ? Qt::DescendingOrder
                    : Qt::AscendingOrder;
            m_tree->sortByColumn(option.column, nextOrder);
        });
    }
}

void ExplorerPane::applyClipboard(ClipboardOperation operation) {
    const QStringList paths = selectedPaths();
    if (paths.isEmpty()) {
        return;
    }

    PendingClipboard &clipboard = pendingClipboard();
    clipboard.paths = paths;
    clipboard.operation = operation;

    QList<QUrl> urls;
    for (const QString &path : paths) {
        urls.push_back(QUrl::fromLocalFile(path));
    }

    auto *mimeData = new QMimeData();
    mimeData->setUrls(urls);
    QApplication::clipboard()->setMimeData(mimeData);

    emit statusMessage(QString("%1 item%2 ready to %3.")
                           .arg(paths.size())
                           .arg(paths.size() == 1 ? QString() : QString("s"))
                           .arg(operation == ClipboardOperation::Copy ? "copy" : "move"));
}

} // namespace Ixplorer
