#pragma once
#include <QObject>
#include <QVariantAnimation>
#include <QPointer>
#include <QColor>

namespace Ixplorer {

class HoverAnimationFilter : public QObject {
    Q_OBJECT
public:
    explicit HoverAnimationFilter(QObject* parent = nullptr);

protected:
    bool eventFilter(QObject *watched, QEvent *event) override;

private:
    void ensureAnimation(QObject *watched);
    QMap<QObject*, QPointer<QVariantAnimation>> m_animations;
};

} // namespace Ixplorer
