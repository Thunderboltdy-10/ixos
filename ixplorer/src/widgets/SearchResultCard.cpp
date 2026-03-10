#include "widgets/SearchResultCard.h"
#include "theme/Colors.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QPainter>
#include <QStyle>
#include <QFileInfo>
#include <QLinearGradient>

namespace Ixplorer {

ScoreBar::ScoreBar(QWidget *parent) : QWidget(parent) {
    setFixedHeight(4);
}

void ScoreBar::setScore(double score) {
    m_score = qBound(0.0, score, 1.0);
    update();
}

void ScoreBar::paintEvent(QPaintEvent *) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing, false);

    QRect r = rect();
    
    // Background track
    p.fillRect(r, Colors::qc(Colors::BgDeep));
    
    if (m_score > 0) {
        QRect fillRect = r;
        fillRect.setWidth(qRound(r.width() * m_score));
        
        QLinearGradient grad(fillRect.topLeft(), fillRect.topRight());
        grad.setColorAt(0.0, Colors::qc(Colors::AccentAmberDim));
        grad.setColorAt(1.0, Colors::qc(Colors::SemanticGreen));
        
        p.fillRect(fillRect, grad);
    }
}

SearchResultCard::SearchResultCard(QWidget *parent)
    : QWidget(parent)
    , m_scoreBar(new ScoreBar(this))
    , m_rank(new QLabel(this))
    , m_title(new QLabel(this))
    , m_integrityIcon(new QLabel(this))
    , m_meta(new QLabel(this))
    , m_path(new QLabel(this))
    , m_summary(new QLabel(this)) {
    setObjectName("RailResultCard");

    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0); // Inner margins handled by layout or QSS, let's use QSS but we have score bar at top
    layout->setSpacing(0);

    layout->addWidget(m_scoreBar);

    auto *innerWidget = new QWidget(this);
    innerWidget->setObjectName("RailResultInner");
    auto *innerLayout = new QVBoxLayout(innerWidget);
    innerLayout->setContentsMargins(14, 10, 14, 10);
    innerLayout->setSpacing(4);

    auto *topRow = new QHBoxLayout();
    topRow->setContentsMargins(0, 0, 0, 0);
    topRow->setSpacing(8);

    m_rank->setObjectName("RailResultRank");
    topRow->addWidget(m_rank, 0, Qt::AlignTop);

    m_title->setObjectName("RailResultTitle"); // QSS should be 13px semibold
    m_title->setWordWrap(true);
    topRow->addWidget(m_title, 1);
    
    topRow->addWidget(m_integrityIcon, 0, Qt::AlignTop);
    
    innerLayout->addLayout(topRow);

    m_meta->setObjectName("RailResultMeta"); // QSS 11px muted
    m_meta->setWordWrap(true);
    innerLayout->addWidget(m_meta);

    m_path->setObjectName("RailResultPath"); // QSS 11px monospace
    m_path->setWordWrap(true);
    innerLayout->addWidget(m_path);

    m_summary->setObjectName("RailResultSummary");
    m_summary->setWordWrap(true);
    innerLayout->addWidget(m_summary);
    
    layout->addWidget(innerWidget);
}

void SearchResultCard::setContent(
    const SearchHit &item,
    bool semanticResults,
    const QString &relativePath,
    const QString &summary,
    int rank) {
    
    m_scoreBar->setScore(item.score);
    
    const QString kind = semanticResults ? QStringLiteral("Ranked") : QStringLiteral("Quick");
    const QString fileType = item.hasEvidence && !item.evidence.fileType.isEmpty()
                                 ? item.evidence.fileType
                                 : (QFileInfo(item.path).suffix().isEmpty() ? QStringLiteral("file")
                                                                            : QFileInfo(item.path).suffix().toLower());

    m_rank->setText(QString::number(rank));
    m_title->setText(item.filename);
    m_meta->setText(QStringLiteral("%1 \u2022 %2").arg(kind, fileType));
    m_path->setText(relativePath);
    
    // One-line summary with ellipsis (done via QSS or layout typically, but we can force it here)
    // For now we rely on QSS or natural wrap, but the spec says "One-line with ellipsis, expands on selection".
    // We will control the visibility or max-height of summary in setActive.
    m_summary->setText(summary.simplified());
    
    if (item.integrityVerified) {
        m_integrityIcon->setPixmap(style()->standardIcon(QStyle::SP_DialogApplyButton).pixmap(12, 12));
        m_integrityIcon->show();
    } else {
        m_integrityIcon->clear();
        m_integrityIcon->hide();
    }
}

void SearchResultCard::setActive(bool active) {
    setProperty("active", active);
    style()->unpolish(this);
    style()->polish(this);
    
    m_summary->setVisible(active); // Expand summary on selection
    
    update();
}

} // namespace Ixplorer
