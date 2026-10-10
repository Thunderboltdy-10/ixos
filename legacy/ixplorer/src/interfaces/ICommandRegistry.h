#pragma once

#include <QString>
#include <functional>

namespace Ixplorer {

// Stub: future command palette
class ICommandRegistry {
public:
    virtual ~ICommandRegistry() = default;
    virtual void registerCommand(const QString &id, const QString &label, std::function<void()> action) = 0;
    virtual void executeCommand(const QString &id) = 0;
};

} // namespace Ixplorer
