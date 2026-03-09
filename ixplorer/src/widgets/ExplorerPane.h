#pragma once

#include <QFileInfo>
#include <QFileSystemModel>
#include <QMenu>
#include <QWidget>
#include <QTreeView>

namespace Ixplorer {

class FileSystemProxyModel;

class ExplorerPane : public QWidget {
    Q_OBJECT
public:
    enum class ViewMode {
        Details = 0,
        List = 1,
    };

    enum class ClipboardOperation {
        Copy,
        Cut,
    };

    explicit ExplorerPane(const QString &rootPath, QWidget *parent = nullptr);

    QString currentPath() const { return m_currentPath; }
    void setPath(const QString &path);
    void refresh();
    int itemCount() const;
    bool canGoBack() const;
    bool canGoForward() const;
    bool canGoUp() const;
    void goBack();
    void goForward();
    void goUp();
    void setFilterText(const QString &text);
    QStringList selectedPaths() const;
    void selectPath(const QString &path);
    void openSelected();
    void openSelectedWith();
    void revealSelected();
    void renameSelected();
    void deleteSelected();
    void createNewFolder();
    void copySelected();
    void cutSelected();
    void pasteIntoCurrentDirectory();
    void duplicateSelected();
    void showProperties();
    void setViewMode(ViewMode mode);
    ViewMode viewMode() const { return m_viewMode; }

signals:
    void pathChanged(const QString &path);
    void navigationStateChanged(bool canGoBack, bool canGoForward, bool canGoUp);
    void selectionChanged(const QFileInfo &primary, int selectedCount, quint64 selectedBytes);
    void selectionCleared();
    void fileActivated(const QFileInfo &info);
    void openInNewTabRequested(const QString &path);
    void statusMessage(const QString &message);

private:
    void onDoubleClicked(const QModelIndex &index);
    void onSelectionChanged();
    void onModelLoaded();
    void showContextMenu(const QPoint &pos);
    void navigateTo(const QString &path, bool recordHistory);
    QFileInfo currentInfo() const;
    void updateNavigationState();
    void configureViewMode();
    void showSortMenu(QMenu &menu);
    void applyClipboard(ClipboardOperation operation);

    QTreeView *m_tree;
    QFileSystemModel *m_fsModel;
    FileSystemProxyModel *m_proxyModel;
    QString m_currentPath;
    QStringList m_history;
    int m_historyIndex = -1;
    bool m_updatingHistory = false;
    ViewMode m_viewMode = ViewMode::Details;
};

} // namespace Ixplorer
