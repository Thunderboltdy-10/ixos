#include "models/FileSystemProxyModel.h"

#include <QFileSystemModel>

namespace Ixplorer {

FileSystemProxyModel::FileSystemProxyModel(QObject *parent)
    : QSortFilterProxyModel(parent) {}

void FileSystemProxyModel::setShowHiddenFiles(bool show) {
    if (m_showHidden != show) {
        m_showHidden = show;
        invalidate();
    }
}

void FileSystemProxyModel::setNameFilter(const QString &filter) {
    if (m_nameFilter != filter) {
        m_nameFilter = filter;
        invalidate();
    }
}

bool FileSystemProxyModel::lessThan(const QModelIndex &left, const QModelIndex &right) const {
    auto *fsModel = qobject_cast<QFileSystemModel *>(sourceModel());
    if (!fsModel)
        return QSortFilterProxyModel::lessThan(left, right);

    QFileInfo leftInfo  = fsModel->fileInfo(left);
    QFileInfo rightInfo = fsModel->fileInfo(right);

    // Folders always sort before files
    if (leftInfo.isDir() != rightInfo.isDir())
        return leftInfo.isDir();

    return QSortFilterProxyModel::lessThan(left, right);
}

bool FileSystemProxyModel::filterAcceptsRow(int sourceRow, const QModelIndex &sourceParent) const {
    auto *fsModel = qobject_cast<QFileSystemModel *>(sourceModel());
    if (!fsModel)
        return true;

    QModelIndex idx = fsModel->index(sourceRow, 0, sourceParent);
    QFileInfo info  = fsModel->fileInfo(idx);

    // Hidden files filter
    if (!m_showHidden && info.isHidden())
        return false;

    // Name filter
    if (!m_nameFilter.isEmpty()) {
        if (!info.fileName().contains(m_nameFilter, Qt::CaseInsensitive))
            return false;
    }

    return true;
}

} // namespace Ixplorer
