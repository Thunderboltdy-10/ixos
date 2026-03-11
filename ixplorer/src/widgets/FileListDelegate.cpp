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
    size.setHeight(30); // Row height: 30px
    return size;
}

void FileListDelegate::paint(QPainter *painter, const QStyleOptionViewItem &option, const QModelIndex &index) const {
    QStyleOptionViewItem opt = option;
    initStyleOption(&opt, index);

    painter->save();

    // Background
    bool isSelected = opt.state & QStyle::State_Selected;
    if (isSelected) {
        painter->fillRect(opt.rect, QColor(10, 132, 255, 25)); // ~0.1 opacity
    } else if (opt.state & QStyle::State_MouseOver) {
        painter->fillRect(opt.rect, QColor(255, 255, 255, 10)); // ~0.04 opacity
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
            QRect iconRect(rect.left() + 4, rect.top() + 6, 18, 18);
            icon.paint(painter, iconRect);

            // Filename
            QRect textRect = rect;
            textRect.setLeft(iconRect.right() + 8);
            
            QFont font("Geist");
            font.setPixelSize(13);
            painter->setFont(font);
            painter->setPen(isSelected ? QColor(255, 255, 255) : QColor(242, 242, 247)); // Pure white if selected
            
            QString text = opt.text;
            painter->drawText(textRect, Qt::AlignVCenter | Qt::AlignLeft, text);
        } else {
            QStyledItemDelegate::paint(painter, opt, index);
        }
    } else {
        // Metadata columns
        QFont font("Geist");
        font.setPixelSize(12);
        painter->setFont(font);
        painter->setPen(isSelected ? QColor(200, 200, 205) : QColor(142, 142, 147)); // Slightly brighter if selected
        
        QRect textRect = rect;
        textRect.setLeft(textRect.left() + 4);
        painter->drawText(textRect, Qt::AlignVCenter | Qt::AlignLeft, opt.text);
    }

    painter->restore();
}

} // namespace Ixplorer
