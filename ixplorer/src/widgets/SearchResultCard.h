#pragma once

#include "search/SearchTypes.h"
#include <QWidget>
#include <QLabel>

namespace Ixplorer {

class ScoreBar : public QWidget {
    Q_OBJECT
public:
    explicit ScoreBar(QWidget *parent = nullptr);
    void setScore(double score);

protected:
    void paintEvent(QPaintEvent *event) override;

private:
    double m_score = 0.0;
};

class SearchResultCard : public QWidget {
    Q_OBJECT
public:
    explicit SearchResultCard(QWidget *parent = nullptr);

    void setContent(const SearchHit &item, bool semanticResults, const QString &relativePath, const QString &summary, int rank);
    void setActive(bool active);

private:
    ScoreBar *m_scoreBar;
    QLabel *m_rank;
    QLabel *m_title;
    QLabel *m_integrityIcon;
    QLabel *m_meta;
    QLabel *m_path;
    QLabel *m_summary;
};

} // namespace Ixplorer
