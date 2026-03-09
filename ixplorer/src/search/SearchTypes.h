#pragma once

#include <QFileInfo>
#include <QJsonArray>
#include <QJsonObject>
#include <QString>
#include <QStringList>

namespace Ixplorer {

enum class SearchMode {
    Fast,
    Auto,
    Accurate,
};

struct SearchRequest {
    QString query;
    QString directory;
    SearchMode mode = SearchMode::Auto;
    int limit = 8;
    int contextLines = 3;
};

struct SearchScoreBreakdown {
    double semantic = 0.0;
    double integrity = 0.0;
    double temporal = 0.0;
    double behavior = 0.0;
    double personal = 0.0;
};

struct SearchContext {
    int lineNumber = 0;
    QStringList before;
    QStringList matched;
    QStringList after;

    bool isEmpty() const {
        return matched.isEmpty() && before.isEmpty() && after.isEmpty();
    }
};

struct SearchEvidence {
    QStringList tags;
    QString explanation;
    int lexicalHitCount = -1;
    QStringList matchedTerms;
    QString semanticPassage;
    QStringList pathTags;
    QString fileType;

    bool isEmpty() const {
        return tags.isEmpty() && explanation.isEmpty() && matchedTerms.isEmpty() &&
               semanticPassage.isEmpty() && pathTags.isEmpty() && fileType.isEmpty() &&
               lexicalHitCount < 0;
    }
};

struct SearchHit {
    QString path;
    QString filename;
    QString directory;
    QString snippet;
    double score = 0.0;
    bool integrityVerified = false;
    bool isLexical = false;
    bool hasScoreBreakdown = false;
    bool hasContext = false;
    bool hasEvidence = false;
    SearchScoreBreakdown scoreBreakdown;
    SearchContext context;
    SearchEvidence evidence;
};

inline QString searchModeLabel(SearchMode mode) {
    switch (mode) {
    case SearchMode::Fast:
        return QStringLiteral("Fast");
    case SearchMode::Accurate:
        return QStringLiteral("Accurate");
    case SearchMode::Auto:
    default:
        return QStringLiteral("Auto");
    }
}

inline QString searchModeToCliValue(SearchMode mode) {
    switch (mode) {
    case SearchMode::Fast:
        return QStringLiteral("flash");
    case SearchMode::Accurate:
        return QStringLiteral("pro");
    case SearchMode::Auto:
    default:
        return QStringLiteral("auto");
    }
}

inline QStringList stringListFromJson(const QJsonValue &value) {
    QStringList output;
    const auto array = value.toArray();
    output.reserve(array.size());
    for (const auto &entry : array) {
        output.append(entry.toString());
    }
    return output;
}

inline QJsonValue jsonValueEither(
    const QJsonObject &object,
    const QString &camelCase,
    const QString &snakeCase) {
    if (object.contains(camelCase)) {
        return object.value(camelCase);
    }
    return object.value(snakeCase);
}

inline SearchContext parseSearchContext(const QJsonObject &object) {
    SearchContext context;
    context.lineNumber = jsonValueEither(object, QStringLiteral("lineNumber"), QStringLiteral("line_number")).toInt();
    context.before = stringListFromJson(jsonValueEither(object, QStringLiteral("before"), QStringLiteral("before")));
    context.matched = stringListFromJson(jsonValueEither(object, QStringLiteral("matched"), QStringLiteral("matched")));
    context.after = stringListFromJson(jsonValueEither(object, QStringLiteral("after"), QStringLiteral("after")));
    return context;
}

inline SearchEvidence parseSearchEvidence(const QJsonObject &object) {
    SearchEvidence evidence;
    evidence.tags = stringListFromJson(jsonValueEither(object, QStringLiteral("tags"), QStringLiteral("tags")));
    evidence.explanation = jsonValueEither(object, QStringLiteral("explanation"), QStringLiteral("explanation")).toString();
    if (object.contains(QStringLiteral("lexicalHitCount")) || object.contains(QStringLiteral("lexical_hit_count"))) {
        evidence.lexicalHitCount = jsonValueEither(object, QStringLiteral("lexicalHitCount"), QStringLiteral("lexical_hit_count")).toInt(-1);
    }
    evidence.matchedTerms = stringListFromJson(jsonValueEither(object, QStringLiteral("matchedTerms"), QStringLiteral("matched_terms")));
    evidence.semanticPassage = jsonValueEither(object, QStringLiteral("semanticPassage"), QStringLiteral("semantic_passage")).toString();
    evidence.pathTags = stringListFromJson(jsonValueEither(object, QStringLiteral("pathTags"), QStringLiteral("path_tags")));
    evidence.fileType = jsonValueEither(object, QStringLiteral("fileType"), QStringLiteral("file_type")).toString();
    return evidence;
}

inline SearchHit parseSearchHit(const QJsonObject &object, bool lexical) {
    SearchHit hit;
    hit.path = object.value(QStringLiteral("path")).toString();
    hit.score = object.value(QStringLiteral("score")).toDouble();
    hit.integrityVerified = object.value(QStringLiteral("integrity_verified")).toBool();
    hit.isLexical = lexical;

    const QFileInfo info(hit.path);
    hit.filename = info.fileName().isEmpty() ? hit.path : info.fileName();
    hit.directory = info.absolutePath();
    hit.snippet = object.value(QStringLiteral("snippet")).toString();

    if (const auto breakdown = object.value(QStringLiteral("score_breakdown")).toObject();
        !breakdown.isEmpty()) {
        hit.hasScoreBreakdown = true;
        hit.scoreBreakdown.semantic = breakdown.value(QStringLiteral("semantic")).toDouble();
        hit.scoreBreakdown.integrity = breakdown.value(QStringLiteral("integrity")).toDouble();
        hit.scoreBreakdown.temporal = breakdown.value(QStringLiteral("temporal")).toDouble();
        hit.scoreBreakdown.behavior = breakdown.value(QStringLiteral("behavior")).toDouble();
        hit.scoreBreakdown.personal = breakdown.value(QStringLiteral("personal")).toDouble();
    }

    if (const auto context = object.value(QStringLiteral("context")).toObject();
        !context.isEmpty()) {
        hit.context = parseSearchContext(context);
        hit.hasContext = !hit.context.isEmpty();
    }

    if (const auto evidence = object.value(QStringLiteral("evidence")).toObject();
        !evidence.isEmpty()) {
        hit.evidence = parseSearchEvidence(evidence);
        hit.hasEvidence = !hit.evidence.isEmpty();
    }

    return hit;
}

inline QList<SearchHit> parseSearchHits(const QJsonArray &array, bool lexical, int limit) {
    QList<SearchHit> hits;
    const int capped = limit > 0 ? qMin(limit, array.size()) : array.size();
    hits.reserve(capped);
    for (int i = 0; i < capped; ++i) {
        hits.append(parseSearchHit(array.at(i).toObject(), lexical));
    }
    return hits;
}

} // namespace Ixplorer

Q_DECLARE_METATYPE(Ixplorer::SearchRequest)
Q_DECLARE_METATYPE(Ixplorer::SearchHit)
Q_DECLARE_METATYPE(QList<Ixplorer::SearchHit>)
