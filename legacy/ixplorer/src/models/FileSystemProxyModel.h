#pragma once

#include <QSortFilterProxyModel>

namespace Ixplorer {

class FileSystemProxyModel : public QSortFilterProxyModel {
    Q_OBJECT
public:
    explicit FileSystemProxyModel(QObject *parent = nullptr);

    void setShowHiddenFiles(bool show);
    bool showHiddenFiles() const { return m_showHidden; }

    void setNameFilter(const QString &filter);

protected:
    bool lessThan(const QModelIndex &left, const QModelIndex &right) const override;
    bool filterAcceptsRow(int sourceRow, const QModelIndex &sourceParent) const override;

private:
    bool m_showHidden = false;
    QString m_nameFilter;
};

} // namespace Ixplorer
