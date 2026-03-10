#pragma once
#include <QString>

namespace Ixplorer {

class FuzzyMatch {
public:
    static int score(const QString& query, const QString& target);
};

} // namespace Ixplorer
