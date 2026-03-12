#include "data/RelationshipView.h"

#include <QGraphicsEllipseItem>
#include <QGraphicsLineItem>
#include <QGraphicsTextItem>
#include <QMouseEvent>
#include <QPen>
#include <QWheelEvent>

#include <cmath>
#include <utility>

namespace Ixplorer {

RelationshipView::RelationshipView(QWidget *parent)
    : QGraphicsView(parent)
    , m_scene(new QGraphicsScene(this)) {
    setScene(m_scene);
    setRenderHint(QPainter::Antialiasing, true);
    setDragMode(QGraphicsView::ScrollHandDrag);
    setTransformationAnchor(QGraphicsView::AnchorUnderMouse);
}

void RelationshipView::setGraph(const RelationshipGraph &graph) {
    m_graph = graph;
    rebuildScene();
}

const RelationshipGraph &RelationshipView::graph() const {
    return m_graph;
}

void RelationshipView::clearGraph() {
    m_graph = RelationshipGraph();
    m_scene->clear();
}

void RelationshipView::mouseDoubleClickEvent(QMouseEvent *event) {
    if (QGraphicsItem *item = itemAt(event->pos())) {
        const QString path = item->data(2).toString();
        if (!path.isEmpty()) {
            emit pathActivated(path);
        }
    }
    QGraphicsView::mouseDoubleClickEvent(event);
}

void RelationshipView::wheelEvent(QWheelEvent *event) {
    const qreal factor = event->angleDelta().y() > 0 ? 1.15 : 1.0 / 1.15;
    scale(factor, factor);
}

void RelationshipView::rebuildScene() {
    m_scene->clear();
    if (m_graph.nodes.isEmpty()) {
        return;
    }

    QHash<QString, QPointF> positions;
    const qreal radius = 180.0;
    const qreal step = (2.0 * M_PI) / static_cast<qreal>(m_graph.nodes.size());
    for (int i = 0; i < m_graph.nodes.size(); ++i) {
        const qreal angle = i * step;
        positions.insert(m_graph.nodes.at(i).id, QPointF(radius * std::cos(angle), radius * std::sin(angle)));
    }

    for (const RelationshipEdge &edge : std::as_const(m_graph.edges)) {
        if (!positions.contains(edge.sourceId) || !positions.contains(edge.targetId)) {
            continue;
        }
        const QColor edgeColor(101, 119, 134, static_cast<int>(80 + edge.weight * 120.0f));
        m_scene->addLine(QLineF(positions.value(edge.sourceId), positions.value(edge.targetId)), QPen(edgeColor, 1.0 + edge.weight * 2.0));
    }

    for (const RelationshipNode &node : std::as_const(m_graph.nodes)) {
        const QPointF position = positions.value(node.id);
        const qreal diameter = node.primary ? 36.0 : 22.0 + node.weight * 10.0;
        const QRectF rect(position.x() - diameter / 2.0, position.y() - diameter / 2.0, diameter, diameter);

        auto *ellipse = m_scene->addEllipse(rect,
                                            QPen(node.primary ? QColor("#2D7FF9") : QColor("#8C96A5"), 1.5),
                                            QBrush(node.primary ? QColor("#BFD9FF") : QColor("#E5EAF0")));
        ellipse->setData(0, node.id);
        ellipse->setData(1, node.label);
        ellipse->setData(2, node.path);
        ellipse->setToolTip(node.path.isEmpty() ? node.label : QStringLiteral("%1\n%2").arg(node.label, node.path));

        auto *label = m_scene->addText(node.label);
        label->setDefaultTextColor(QColor("#1F2933"));
        label->setPos(position.x() + diameter / 2.0 + 6.0, position.y() - 10.0);
    }

    setSceneRect(m_scene->itemsBoundingRect().adjusted(-40, -40, 40, 40));
}

} // namespace Ixplorer
