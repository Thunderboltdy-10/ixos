#pragma once

#include <QHash>
#include <QString>

namespace Ixplorer {

struct PersonalSignal {
    float openScore = 0.0f;
    qint64 lastOpenMs = 0;
    bool pinned = false;
    bool ignored = false;
};

class PersonalRanker {
public:
    PersonalRanker();

    void markOpened(const QString &path);
    void pin(const QString &path, bool enabled);
    void ignore(const QString &path, bool enabled);
    float getBoost(const QString &path) const;

private:
    QString storagePath() const;
    void load();
    void save() const;
    static QString normalizePath(const QString &path);

    QHash<QString, PersonalSignal> m_signals;
};

} // namespace Ixplorer
