#include "data/PersonalRanker.h"

#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QStandardPaths>
#include <QtMath>

namespace Ixplorer {

namespace {

constexpr double kDecayTauMs = 7.0 * 24.0 * 60.0 * 60.0 * 1000.0;

double recencyFactor(qint64 lastOpenMs, qint64 nowMs) {
    if (lastOpenMs <= 0 || nowMs <= lastOpenMs) {
        return 0.0;
    }
    const double delta = static_cast<double>(nowMs - lastOpenMs);
    return qExp(-delta / kDecayTauMs);
}

} // namespace

PersonalRanker::PersonalRanker() {
    load();
}

void PersonalRanker::markOpened(const QString &path) {
    const QString key = normalizePath(path);
    const qint64 now = QDateTime::currentMSecsSinceEpoch();
    PersonalSignal signal = m_signals.value(key);
    const double decay = signal.lastOpenMs > 0 ? recencyFactor(signal.lastOpenMs, now) : 0.0;
    signal.openScore = static_cast<float>(signal.openScore * decay + 1.0);
    signal.lastOpenMs = now;
    m_signals.insert(key, signal);
    save();
}

void PersonalRanker::pin(const QString &path, bool enabled) {
    const QString key = normalizePath(path);
    PersonalSignal signal = m_signals.value(key);
    signal.pinned = enabled;
    m_signals.insert(key, signal);
    save();
}

void PersonalRanker::ignore(const QString &path, bool enabled) {
    const QString key = normalizePath(path);
    PersonalSignal signal = m_signals.value(key);
    signal.ignored = enabled;
    m_signals.insert(key, signal);
    save();
}

float PersonalRanker::getBoost(const QString &path) const {
    const QString key = normalizePath(path);
    const PersonalSignal signal = m_signals.value(key);
    if (signal.ignored) {
        return 0.0f;
    }

    const qint64 now = QDateTime::currentMSecsSinceEpoch();
    const float normalizedOpen = qBound(0.0f, signal.openScore / 20.0f, 1.0f);
    const float recency = static_cast<float>(recencyFactor(signal.lastOpenMs, now));
    float score = normalizedOpen * 0.65f + recency * 0.35f;
    if (signal.pinned) {
        score = qMin(1.0f, score + 0.25f);
    }
    return qBound(0.0f, score * 0.15f, 0.15f);
}

QString PersonalRanker::storagePath() const {
    const QString baseDir =
        QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation) + QStringLiteral("/ixplorer");
    QDir().mkpath(baseDir);
    return baseDir + QStringLiteral("/personal_signals_v1.json");
}

void PersonalRanker::load() {
    QFile file(storagePath());
    if (!file.open(QIODevice::ReadOnly)) {
        return;
    }

    const QJsonDocument document = QJsonDocument::fromJson(file.readAll());
    if (!document.isObject()) {
        return;
    }

    const QJsonObject object = document.object();
    for (auto it = object.begin(); it != object.end(); ++it) {
        const QJsonObject signalObject = it.value().toObject();
        PersonalSignal signal;
        signal.openScore = static_cast<float>(signalObject.value(QStringLiteral("openScore")).toDouble());
        signal.lastOpenMs = signalObject.value(QStringLiteral("lastOpenMs")).toString().toLongLong();
        signal.pinned = signalObject.value(QStringLiteral("pinned")).toBool();
        signal.ignored = signalObject.value(QStringLiteral("ignored")).toBool();
        m_signals.insert(it.key(), signal);
    }
}

void PersonalRanker::save() const {
    QJsonObject object;
    for (auto it = m_signals.cbegin(); it != m_signals.cend(); ++it) {
        QJsonObject signalObject;
        signalObject.insert(QStringLiteral("openScore"), it.value().openScore);
        signalObject.insert(QStringLiteral("lastOpenMs"), QString::number(it.value().lastOpenMs));
        signalObject.insert(QStringLiteral("pinned"), it.value().pinned);
        signalObject.insert(QStringLiteral("ignored"), it.value().ignored);
        object.insert(it.key(), signalObject);
    }

    QFile file(storagePath());
    if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        return;
    }
    file.write(QJsonDocument(object).toJson(QJsonDocument::Compact));
}

QString PersonalRanker::normalizePath(const QString &path) {
    return QDir::toNativeSeparators(path).toLower();
}

} // namespace Ixplorer
