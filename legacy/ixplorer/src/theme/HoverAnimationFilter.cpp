#include "theme/HoverAnimationFilter.h"
#include "theme/Colors.h"
#include <QEvent>
#include <QHoverEvent>
#include <QWidget>

namespace Ixplorer {

HoverAnimationFilter::HoverAnimationFilter(QObject* parent) : QObject(parent) {}

bool HoverAnimationFilter::eventFilter(QObject *watched, QEvent *event) {
    if (event->type() == QEvent::HoverEnter || event->type() == QEvent::HoverLeave) {
        auto *widget = qobject_cast<QWidget*>(watched);
        if (widget) {
            QString name = widget->objectName();
            // Exclude SidebarItem — QSS :hover and [current="true"] handle it
            if (name == "ToolbarNavButton" || name == "ToolbarPrimaryButton" || name == "ToolbarGhostButton" || name == "DocumentGhostButton") {
                if (event->type() == QEvent::HoverEnter) {
                    ensureAnimation(watched);
                    if (auto anim = m_animations.value(watched)) {
                        anim->stop();
                        anim->setStartValue(Colors::qc(Colors::BgBase));
                        anim->setEndValue(Colors::qc(Colors::BgOverlay));
                        anim->start();
                    }
                } else if (event->type() == QEvent::HoverLeave) {
                    ensureAnimation(watched);
                    if (auto anim = m_animations.value(watched)) {
                        anim->stop();
                        anim->setStartValue(Colors::qc(Colors::BgOverlay));
                        anim->setEndValue(Colors::qc(Colors::BgBase));
                        anim->start();
                    }
                }
            }
        }
    }
    return QObject::eventFilter(watched, event);
}

void HoverAnimationFilter::ensureAnimation(QObject *watched) {
    if (!m_animations.contains(watched) || !m_animations.value(watched)) {
        auto *widget = qobject_cast<QWidget*>(watched);
        if (!widget) return;
        
        auto *anim = new QVariantAnimation(this);
        anim->setDuration(100);
        connect(anim, &QVariantAnimation::valueChanged, widget, [widget](const QVariant &val) {
            QColor color = val.value<QColor>();
            QString name = widget->objectName();
            widget->setStyleSheet(QString("#%1 { background-color: %2; }").arg(name, color.name()));
        });
        m_animations.insert(watched, anim);
    }
}

} // namespace Ixplorer
