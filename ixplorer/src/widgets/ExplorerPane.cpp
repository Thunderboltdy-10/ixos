#include "widgets/ExplorerPane.h"
#include "models/FileSystemProxyModel.h"

#include <QApplication>
#include <QClipboard>
#include <QDesktopServices>
#include <QDir>
#include <QHeaderView>
#include <QMenu>
#include <QMessageBox>
#include <QShortcut>
#include <QUrl>
#include <QVBoxLayout>

namespace Ixplorer {

ExplorerPane::ExplorerPane(const QString &rootPath, QWidget *parent)
    : QWidget(parent)
    , m_tree(new QTreeView(this))
    , m_fsModel(new QFileSystemModel(this))
    , m_proxyModel(new FileSystemProxyModel(this)) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);
    layout->addWidget(m_tree);

    // Configure file system model
    m_fsModel->setRootPath(rootPath);
    m_fsModel->setFilter(QDir::AllEntries | QDir::NoDotAndDotDot);
    m_fsModel->setNameFilterDisables(false);
    m_fsModel->setReadOnly(false); // Allow rename/delete

    // Proxy model for folder-first sorting
    m_proxyModel->setSourceModel(m_fsModel);
    m_proxyModel->setSortRole(QFileSystemModel::FileNameRole);

    // Tree view setup
    m_tree->setModel(m_proxyModel);
    m_tree->setRootIsDecorated(false);
    m_tree->setItemsExpandable(false);
    m_tree->setUniformRowHeights(true);
    m_tree->setSortingEnabled(true);
    m_tree->sortByColumn(0, Qt::AscendingOrder);
    m_tree->setSelectionMode(QAbstractItemView::ExtendedSelection);
    m_tree->setAlternatingRowColors(false);
    m_tree->setEditTriggers(QAbstractItemView::NoEditTriggers);
    m_tree->setIndentation(0);

    // Context menu
    m_tree->setContextMenuPolicy(Qt::CustomContextMenu);
    connect(m_tree, &QTreeView::customContextMenuRequested,
            this, &ExplorerPane::showContextMenu);

    // Column widths
    auto *header = m_tree->header();
    header->setStretchLastSection(false);
    header->setSectionResizeMode(0, QHeaderView::Stretch);
    header->resizeSection(1, 180); // Date Modified
    header->resizeSection(2, 100); // Type
    header->resizeSection(3, 80);  // Size

    // Connections
    connect(m_tree, &QTreeView::doubleClicked, this, &ExplorerPane::onDoubleClicked);
    connect(m_tree->selectionModel(), &QItemSelectionModel::selectionChanged,
            this, &ExplorerPane::onSelectionChanged);
    connect(m_fsModel, &QFileSystemModel::directoryLoaded,
            this, &ExplorerPane::onModelLoaded);

    // Keyboard shortcuts
    auto *renameKey = new QShortcut(QKeySequence(Qt::Key_F2), m_tree);
    connect(renameKey, &QShortcut::activated, this, &ExplorerPane::renameSelected);

    auto *deleteKey = new QShortcut(QKeySequence(Qt::Key_Delete), m_tree);
    connect(deleteKey, &QShortcut::activated, this, &ExplorerPane::deleteSelected);

    setPath(rootPath);
}

void ExplorerPane::setPath(const QString &path) {
    QDir dir(path);
    if (!dir.exists())
        return;

    m_currentPath = QDir::toNativeSeparators(dir.absolutePath());

    QModelIndex srcIdx = m_fsModel->setRootPath(path);
    QModelIndex proxyIdx = m_proxyModel->mapFromSource(srcIdx);
    m_tree->setRootIndex(proxyIdx);

    emit pathChanged(m_currentPath);
}

void ExplorerPane::refresh() {
    setPath(QDir::fromNativeSeparators(m_currentPath));
}

int ExplorerPane::itemCount() const {
    QModelIndex root = m_tree->rootIndex();
    return m_proxyModel->rowCount(root);
}

void ExplorerPane::onDoubleClicked(const QModelIndex &index) {
    QModelIndex srcIdx = m_proxyModel->mapToSource(index);
    QFileInfo info = m_fsModel->fileInfo(srcIdx);

    if (info.isDir()) {
        setPath(info.absoluteFilePath());
    } else {
        emit fileActivated(info);
        QDesktopServices::openUrl(QUrl::fromLocalFile(info.absoluteFilePath()));
    }
}

void ExplorerPane::onSelectionChanged() {
    auto indexes = m_tree->selectionModel()->selectedRows();
    if (indexes.isEmpty())
        return;

    QModelIndex srcIdx = m_proxyModel->mapToSource(indexes.first());
    QFileInfo info = m_fsModel->fileInfo(srcIdx);
    emit fileSelected(info);
}

void ExplorerPane::onModelLoaded() {
    emit pathChanged(m_currentPath);
}

void ExplorerPane::showContextMenu(const QPoint &pos) {
    QModelIndex proxyIdx = m_tree->indexAt(pos);
    QMenu menu(m_tree);

    if (proxyIdx.isValid()) {
        QModelIndex srcIdx = m_proxyModel->mapToSource(proxyIdx);
        QFileInfo info = m_fsModel->fileInfo(srcIdx);

        // Open
        QAction *openAct = menu.addAction("Open");
        connect(openAct, &QAction::triggered, this, [this, info]() {
            if (info.isDir()) {
                setPath(info.absoluteFilePath());
            } else {
                QDesktopServices::openUrl(QUrl::fromLocalFile(info.absoluteFilePath()));
            }
        });

        // Open in New Tab (folders only)
        if (info.isDir()) {
            QAction *newTabAct = menu.addAction("Open in New Tab");
            connect(newTabAct, &QAction::triggered, this, [this, info]() {
                emit openInNewTabRequested(info.absoluteFilePath());
            });
        }

        menu.addSeparator();

        // Copy path
        QAction *copyPathAct = menu.addAction("Copy Path");
        connect(copyPathAct, &QAction::triggered, this, [info]() {
            QApplication::clipboard()->setText(
                QDir::toNativeSeparators(info.absoluteFilePath()));
        });

        menu.addSeparator();

        // Rename
        QAction *renameAct = menu.addAction("Rename");
        renameAct->setShortcut(QKeySequence(Qt::Key_F2));
        connect(renameAct, &QAction::triggered, this, &ExplorerPane::renameSelected);

        // Delete
        QAction *deleteAct = menu.addAction("Delete");
        deleteAct->setShortcut(QKeySequence(Qt::Key_Delete));
        connect(deleteAct, &QAction::triggered, this, &ExplorerPane::deleteSelected);

        menu.addSeparator();
    }

    // Always-available actions
    QAction *newFolderAct = menu.addAction("New Folder");
    connect(newFolderAct, &QAction::triggered, this, &ExplorerPane::createNewFolder);

    menu.addSeparator();

    QAction *refreshAct = menu.addAction("Refresh");
    refreshAct->setShortcut(QKeySequence(Qt::Key_F5));
    connect(refreshAct, &QAction::triggered, this, &ExplorerPane::refresh);

    // Sort submenu
    QMenu *sortMenu = menu.addMenu("Sort by");
    auto addSortAction = [this, sortMenu](const QString &label, int col) {
        QAction *act = sortMenu->addAction(label);
        connect(act, &QAction::triggered, this, [this, col]() {
            m_tree->sortByColumn(col, Qt::AscendingOrder);
        });
    };
    addSortAction("Name", 0);
    addSortAction("Size", 3);
    addSortAction("Type", 2);
    addSortAction("Date Modified", 1);

    menu.exec(m_tree->viewport()->mapToGlobal(pos));
}

void ExplorerPane::renameSelected() {
    QModelIndex current = m_tree->currentIndex();
    if (!current.isValid())
        return;
    // Ensure we're editing column 0 (Name)
    QModelIndex nameIdx = m_proxyModel->index(current.row(), 0, current.parent());
    m_tree->edit(nameIdx);
}

void ExplorerPane::deleteSelected() {
    auto indexes = m_tree->selectionModel()->selectedRows();
    if (indexes.isEmpty())
        return;

    // Collect file names for confirmation
    QStringList names;
    for (const auto &idx : indexes) {
        QModelIndex srcIdx = m_proxyModel->mapToSource(idx);
        names << m_fsModel->fileInfo(srcIdx).fileName();
    }

    QString msg = names.size() == 1
        ? QString("Move \"%1\" to Recycle Bin?").arg(names.first())
        : QString("Move %1 items to Recycle Bin?").arg(names.size());

    auto result = QMessageBox::question(this, "Delete", msg,
        QMessageBox::Yes | QMessageBox::No, QMessageBox::No);

    if (result != QMessageBox::Yes)
        return;

    for (const auto &idx : indexes) {
        QModelIndex srcIdx = m_proxyModel->mapToSource(idx);
        QFileInfo info = m_fsModel->fileInfo(srcIdx);
        QFile::moveToTrash(info.absoluteFilePath());
    }
}

void ExplorerPane::createNewFolder() {
    QModelIndex rootProxy = m_tree->rootIndex();
    QModelIndex rootSrc = m_proxyModel->mapToSource(rootProxy);

    QModelIndex newDir = m_fsModel->mkdir(rootSrc, "New Folder");
    if (newDir.isValid()) {
        QModelIndex proxyNew = m_proxyModel->mapFromSource(newDir);
        m_tree->setCurrentIndex(proxyNew);
        m_tree->scrollTo(proxyNew);
        m_tree->edit(proxyNew);
    }
}

} // namespace Ixplorer
