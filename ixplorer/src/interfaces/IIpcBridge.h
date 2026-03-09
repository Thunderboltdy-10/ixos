#pragma once

#include <QByteArray>
#include <QString>

namespace Ixplorer {

// Stub: future Rust IPC bridge
class IIpcBridge {
public:
    virtual ~IIpcBridge() = default;
    virtual bool connect() = 0;
    virtual void disconnect() = 0;
    virtual bool isConnected() const = 0;
    virtual QByteArray sendCommand(const QString &command, const QByteArray &payload) = 0;
};

} // namespace Ixplorer
