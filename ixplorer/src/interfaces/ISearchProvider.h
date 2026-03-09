#pragma once

#include <QString>
#include <QStringList>

namespace Ixplorer {

// Stub: future Ixos search integration
class ISearchProvider {
public:
    virtual ~ISearchProvider() = default;
    virtual QStringList search(const QString &query, const QString &directory) = 0;
    virtual bool isAvailable() const = 0;
};

} // namespace Ixplorer
