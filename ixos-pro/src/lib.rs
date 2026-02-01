use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::ptr;

mod answer_card;
mod ask_mode_plus;

#[no_mangle]
pub extern "C" fn ixos_pro_version() -> *const c_char {
    CString::new("0.1.0").unwrap().into_raw()
}

#[no_mangle]
pub extern "C" fn ixos_pro_init() -> i32 {
    0
}

#[no_mangle]
pub extern "C" fn ixos_pro_ask_mode_plus(
    query_json: *const c_char,
    result_buffer: *mut c_char,
    buffer_len: usize,
) -> i32 {
    let input = match unsafe { read_cstr(query_json) } {
        Ok(text) => text,
        Err(_) => return -1,
    };

    let parsed: ask_mode_plus::AskModePlusInput = match serde_json::from_str(&input) {
        Ok(value) => value,
        Err(_) => return -2,
    };

    let result = ask_mode_plus::run(&parsed);
    let output = match serde_json::to_string(&result) {
        Ok(json) => json,
        Err(_) => return -3,
    };

    write_cstr(&output, result_buffer, buffer_len)
}

#[no_mangle]
pub extern "C" fn ixos_pro_extract_answer_card(
    passage_ptr: *const c_char,
    query_ptr: *const c_char,
    result_buffer: *mut c_char,
    buffer_len: usize,
) -> i32 {
    let passage = match unsafe { read_cstr(passage_ptr) } {
        Ok(text) => text,
        Err(_) => return -1,
    };
    let query = match unsafe { read_cstr(query_ptr) } {
        Ok(text) => text,
        Err(_) => return -1,
    };

    let card = answer_card::extract_answer_card(&passage, &query);
    let output = match serde_json::to_string(&card) {
        Ok(json) => json,
        Err(_) => return -3,
    };

    write_cstr(&output, result_buffer, buffer_len)
}

unsafe fn read_cstr(ptr: *const c_char) -> Result<String, ()> {
    if ptr.is_null() {
        return Err(());
    }
    let cstr = unsafe { CStr::from_ptr(ptr) };
    cstr.to_str().map(|s| s.to_string()).map_err(|_| ())
}

fn write_cstr(value: &str, buffer: *mut c_char, buffer_len: usize) -> i32 {
    if buffer.is_null() || buffer_len == 0 {
        return -1;
    }

    let bytes = value.as_bytes();
    if bytes.len() + 1 > buffer_len {
        return -4;
    }

    unsafe {
        ptr::copy_nonoverlapping(bytes.as_ptr(), buffer as *mut u8, bytes.len());
        *buffer.add(bytes.len()) = 0;
    }

    0
}
