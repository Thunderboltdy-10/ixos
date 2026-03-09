#pragma once

#include <QWidget>
#include <QTreeView>
#include <QFileSystemModel>
#include <QFileInfo>

namespace Ixplorer {

class FileSystemProxyModel;

class ExplorerPane : public QWidget {
    Q_OBJECT
public:
    explicit ExplorerPane(const QString &rootPath, QWidget *parent = nullptr);

    QString currentPath() const { return m_currentPath; }
    void setPath(const QString &path);
    void refresh();
    int itemCount() const;

signals:
    void pathChanged(const QString &path);
    void fileSelected(const QFileInfo &info);
    void fileActivated(const QFileInfo &info);

private:
    void onDoubleClicked(const QModelIndex &index);
    void onSelectionChanged();
    void onModelLoaded();

    QTreeView *m_tree;
    QFileSystemModel *m_fsModel;
    FileSystemProxyModel *m_proxyModel;
    QString m_currentPath;
};

} // namespace Ixplorer
