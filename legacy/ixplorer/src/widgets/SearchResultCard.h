#pragma once

#include "search/SearchTypes.h"
#include <QWidget>
#include <QLabel>

namespace Ixplorer {

class SearchResultCard : public QWidget {
    Q_OBJECT
public:
    explicit SearchResultCard(QWidget *parent = nullptr);

    void setContent(const SearchHit &item, bool semanticResults, const QString &relativePath, const QString &summary, int rank);
    void setActive(bool active);

private:
    QLabel *m_icon;
    QLabel *m_title;
    QLabel *m_path;
};

} // namespace Ixplorer
