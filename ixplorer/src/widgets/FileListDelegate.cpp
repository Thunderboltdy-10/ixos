#include "widgets/FileListDelegate.h"
#include "theme/ThemedFileIconProvider.h"

#include <QPainter>
#include <QFileInfo>
#include <QFileSystemModel>
#include <QSortFilterProxyModel>

namespace Ixplorer {

FileListDelegate::FileListDelegate(QObject *parent)
    : QStyledItemDelegate(parent) {
}

QSize FileListDelegate::sizeHint(const QStyleOptionViewItem &option, const QModelIndex &index) const {
    QSize size = QStyledItemDelegate::sizeHint(option, index);
    size.setHeight(22); // Ultra dense height
    return size;
}

void FileListDelegate::paint(QPainter *painter, const QStyleOptionViewItem &option, const QModelIndex &index) const {
    QStyleOptionViewItem opt = option;
    initStyleOption(&opt, index);

    painter->save();

    // Background
    bool isSelected = opt.state & QStyle::State_Selected;
    if (isSelected) {
        painter->fillRect(opt.rect, QColor(0, 120, 215, 40)); // Windows Blue selection
    } else if (opt.state & QStyle::State_MouseOver) {
        painter->fillRect(opt.rect, QColor(255, 255, 255, 12)); // Subtle hover
    }

    QRect rect = opt.rect;

    if (index.column() == 0) {
        const QAbstractItemModel* baseModel = index.model();
        QModelIndex sourceIndex = index;
        if (auto* proxy = qobject_cast<const QSortFilterProxyModel*>(baseModel)) {
            baseModel = proxy->sourceModel();
            sourceIndex = proxy->mapToSource(index);
        }
        
        auto *fsModel = qobject_cast<const QFileSystemModel*>(baseModel);
        if (fsModel) {
            QFileInfo info = fsModel->fileInfo(sourceIndex);
            
            // Icon
            ThemedFileIconProvider provider;
            QIcon icon = provider.icon(info);
            QRect iconRect(rect.left() + 6, rect.top() + 5, 18, 18);
            icon.paint(painter, iconRect);

            // Filename
            QRect textRect = rect;
            textRect.setLeft(iconRect.right() + 10);
            
            painter->setPen(QColor(255, 255, 255));
            painter->drawText(textRect, Qt::AlignVCenter | Qt::AlignLeft, opt.text);
        } else {
            QStyledItemDelegate::paint(painter, opt, index);
        }
    } else {
        // Metadata columns
        painter->setPen(QColor(161, 161, 170)); // Muted text for metadata
        QRect textRect = rect;
        textRect.setLeft(textRect.left() + 6);
        painter->drawText(textRect, Qt::AlignVCenter | Qt::AlignLeft, opt.text);
    }

    painter->restore();
}

} // namespace Ixplorer
