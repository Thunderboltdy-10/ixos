#pragma once

#include <QStyledItemDelegate>

namespace Ixplorer {

class FileListDelegate : public QStyledItemDelegate {
    Q_OBJECT
public:
    explicit FileListDelegate(QObject *parent = nullptr);

    QSize sizeHint(const QStyleOptionViewItem &option, const QModelIndex &index) const override;
    void paint(QPainter *painter, const QStyleOptionViewItem &option, const QModelIndex &index) const override;
};

} // namespace Ixplorer
