#pragma once

#include <QGraphicsScene>
#include <QGraphicsView>
#include <QPointF>
#include <QString>
#include <QVector>

namespace Ixplorer {

struct RelationshipNode {
    QString id;
    QString label;
    QString path;
    float weight = 1.0f;
    bool primary = false;
};

struct RelationshipEdge {
    QString sourceId;
    QString targetId;
    float weight = 0.0f;
};

struct RelationshipGraph {
    QString title;
    QVector<RelationshipNode> nodes;
    QVector<RelationshipEdge> edges;
};

class RelationshipView : public QGraphicsView {
    Q_OBJECT
public:
    explicit RelationshipView(QWidget *parent = nullptr);

    void setGraph(const RelationshipGraph &graph);
    const RelationshipGraph &graph() const;
    void clearGraph();

signals:
    void pathActivated(const QString &path);

protected:
    void mouseDoubleClickEvent(QMouseEvent *event) override;
    void wheelEvent(QWheelEvent *event) override;

private:
    void rebuildScene();

    QGraphicsScene *m_scene = nullptr;
    RelationshipGraph m_graph;
};

} // namespace Ixplorer

Q_DECLARE_METATYPE(Ixplorer::RelationshipNode)
Q_DECLARE_METATYPE(Ixplorer::RelationshipEdge)
Q_DECLARE_METATYPE(Ixplorer::RelationshipGraph)
