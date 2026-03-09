#pragma once

#include "search/SearchTypes.h"

#include <QObject>

namespace Ixplorer {

class ISearchProvider : public QObject {
    Q_OBJECT
public:
    explicit ISearchProvider(QObject *parent = nullptr)
        : QObject(parent) {}
    ~ISearchProvider() override = default;

    virtual bool isAvailable() const = 0;

public slots:
    virtual void startSearch(const SearchRequest &request) = 0;
    virtual void cancelSearch() = 0;

signals:
    void searchStarted(const SearchRequest &request);
    void searchStateChanged(const QString &message, bool isError);
    void lexicalResultsReady(const QList<SearchHit> &hits);
    void semanticResultsReady(const QList<SearchHit> &hits);
    void searchFinished();
    void searchFailed(const QString &message);
};

} // namespace Ixplorer
