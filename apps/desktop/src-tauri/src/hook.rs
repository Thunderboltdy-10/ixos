//! The quick search shortcut on Windows. A low-level keyboard hook installed after
//! other apps sees key presses before them, so a combination another app also
//! claims, such as Ctrl+Space, still reaches Ixos.
use std::{
    cell::Cell,
    sync::{Mutex, Once},
};
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut};
use windows_sys::Win32::{
    Foundation::{LPARAM, LRESULT, WPARAM},
    System::LibraryLoader::GetModuleHandleW,
    UI::{
        Input::KeyboardAndMouse::{
            GetAsyncKeyState, VIRTUAL_KEY, VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
        },
        WindowsAndMessaging::{
            CallNextHookEx, GetMessageW, SetWindowsHookExW, HC_ACTION, KBDLLHOOKSTRUCT,
            WH_KEYBOARD_LL, WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
        },
    },
};

struct Listening {
    app: AppHandle,
    shortcut: Shortcut,
    key: u32,
}

static LISTENING: Mutex<Option<Listening>> = Mutex::new(None);
static START: Once = Once::new();

thread_local! {
    static CAPTURED_KEY: Cell<Option<u32>> = const { Cell::new(None) };
}

/// Opens quick search on `shortcut`, replacing the one before.
pub fn listen(app: &AppHandle, shortcut: Shortcut) -> Result<(), String> {
    let key = virtual_key(shortcut.key).ok_or("This key cannot be used for the shortcut")?;
    *LISTENING.lock().map_err(|error| error.to_string())? = Some(Listening {
        app: app.clone(),
        shortcut,
        key,
    });
    START.call_once(|| {
        std::thread::spawn(run);
    });
    Ok(())
}

pub fn forget(shortcut: Shortcut) {
    if let Ok(mut listening) = LISTENING.lock() {
        if listening
            .as_ref()
            .is_some_and(|listening| listening.shortcut == shortcut)
        {
            *listening = None;
        }
    }
}

fn virtual_key(code: Code) -> Option<u32> {
    let name = code.to_string();
    if let Some(character) = name
        .strip_prefix("Key")
        .or_else(|| name.strip_prefix("Digit"))
    {
        return Some(character.chars().next()? as u32);
    }
    if let Some(number) = name
        .strip_prefix('F')
        .and_then(|number| number.parse::<u32>().ok())
    {
        return (1..=12).contains(&number).then_some(0x6F + number);
    }
    Some(match name.as_str() {
        "Space" => 0x20,
        "Enter" => 0x0D,
        "Escape" => 0x1B,
        "Tab" => 0x09,
        "Backspace" => 0x08,
        "Semicolon" => 0xBA,
        "Equal" => 0xBB,
        "Comma" => 0xBC,
        "Minus" => 0xBD,
        "Period" => 0xBE,
        "Slash" => 0xBF,
        "Backquote" => 0xC0,
        "BracketLeft" => 0xDB,
        "Backslash" => 0xDC,
        "BracketRight" => 0xDD,
        "Quote" => 0xDE,
        _ => return None,
    })
}

/// Hooks are called on the thread that installed them, so it keeps a message loop.
fn run() {
    unsafe {
        let module = GetModuleHandleW(std::ptr::null());
        let hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(on_key), module, 0);
        if hook.is_null() {
            tracing::warn!("Could not install the quick search shortcut");
            return;
        }
        let mut message = std::mem::zeroed();
        while GetMessageW(&mut message, std::ptr::null_mut(), 0, 0) > 0 {}
    }
}

fn held() -> Modifiers {
    let down = |key: VIRTUAL_KEY| unsafe { GetAsyncKeyState(key.into()) < 0 };
    let mut modifiers = Modifiers::empty();
    modifiers.set(Modifiers::CONTROL, down(VK_CONTROL));
    modifiers.set(Modifiers::ALT, down(VK_MENU));
    modifiers.set(Modifiers::SHIFT, down(VK_SHIFT));
    modifiers.set(Modifiers::META, down(VK_LWIN) || down(VK_RWIN));
    modifiers
}

unsafe extern "system" fn on_key(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code == HC_ACTION as i32 {
        let event = &*(lparam as *const KBDLLHOOKSTRUCT);
        // One toggle per press. Swallow repeats and the matching release even if
        // the modifiers were released first.
        if CAPTURED_KEY.get() == Some(event.vkCode) {
            if matches!(wparam as u32, WM_KEYUP | WM_SYSKEYUP) {
                CAPTURED_KEY.set(None);
            }
            return 1;
        }
        if matches!(wparam as u32, WM_KEYDOWN | WM_SYSKEYDOWN) {
            let app = LISTENING.try_lock().ok().and_then(|listening| {
                listening
                    .as_ref()
                    .filter(|listening| {
                        event.vkCode == listening.key && held() == listening.shortcut.mods
                    })
                    .map(|listening| listening.app.clone())
            });
            if let Some(app) = app {
                CAPTURED_KEY.set(Some(event.vkCode));
                // Schedule the toggle and return immediately to the keyboard hook.
                let _ = crate::commands::system::show_overlay(app);
                return 1;
            }
        }
    }
    CallNextHookEx(std::ptr::null_mut(), code, wparam, lparam)
}
