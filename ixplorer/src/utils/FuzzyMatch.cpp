#include "utils/FuzzyMatch.h"
#include <vector>
#include <algorithm>

namespace Ixplorer {

int FuzzyMatch::score(const QString& query, const QString& target) {
    if (query.isEmpty()) return 0;
    if (target.isEmpty()) return -1;
    
    QString q = query.toLower();
    QString t = target.toLower();
    
    int score = 0;
    int qIdx = 0;
    int tIdx = 0;
    int consecutive = 0;
    
    while (qIdx < q.size() && tIdx < t.size()) {
        if (q[qIdx] == t[tIdx]) {
            score += 10;
            score += consecutive * 5; // Consecutive bonus
            
            // Word boundary bonus
            if (tIdx == 0 || !t[tIdx - 1].isLetterOrNumber()) {
                score += 15;
            }
            
            qIdx++;
            consecutive++;
        } else {
            consecutive = 0;
            score -= 1; // Gap penalty
        }
        tIdx++;
    }
    
    if (qIdx < q.size()) {
        return -1; // Didn't match all characters
    }
    
    // Penalty for target length relative to match
    score -= (t.size() - query.size());
    
    return score;
}

} // namespace Ixplorer
