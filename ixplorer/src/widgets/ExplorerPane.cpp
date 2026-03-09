#include "widgets/ExplorerPane.h"
#include "models/FileSystemProxyModel.h"

#include <QDesktopServices>
#include <QDir>
#include <QHeaderView>
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

    // When model finishes loading a directory, update count
    connect(m_fsModel, &QFileSystemModel::directoryLoaded,
            this, &ExplorerPane::onModelLoaded);

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
    // Re-set the same path to force refresh
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
    // Trigger status bar update after model loads
    emit pathChanged(m_currentPath);
}

} // namespace Ixplorer
