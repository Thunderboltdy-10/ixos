//! Native fault-injection worker, compiled only by client unit tests.
use std::io::{BufRead,Write};
fn id(line:&str)->u64 {
    let start=line.find("\"id\":").unwrap()+5;
    line[start..].trim_start().chars().take_while(char::is_ascii_digit).collect::<String>().parse().unwrap()
}
fn sleep_forever()->! {loop {std::thread::sleep(std::time::Duration::from_secs(60));}}
fn main() {
    let mode=std::env::var("IXOS_WORKER_MODE").unwrap_or_default();
    if mode=="no-hello" {sleep_forever();}
    let mut input=std::io::stdin().lock();let mut out=std::io::stdout().lock();
    let mut line=String::new();input.read_line(&mut line).unwrap();let first=id(&line);
    let major=if mode=="bad-major" {99}else{1};
    let caps=if mode=="missing-capability" {"[]"}else{r#"["resident-search","shared-settings","models","cache","skill"]"#};
    writeln!(out,r#"{{"id":{first},"result":{{"protocol_major":{major},"version":"99.0.0","capabilities":{caps}}}}}"#).unwrap();out.flush().unwrap();
    if mode=="hang" || mode=="blocked-write" {sleep_forever();}
    loop {
        line.clear();if input.read_line(&mut line).unwrap()==0 {break;}
        let identifier=id(&line);
        match mode.as_str() {
            "crash"=>std::process::exit(3),
            "incomplete"=>{write!(out,"{{}}").unwrap();out.flush().unwrap();break;},
            "oversized"=>{out.write_all(&vec![b' ';4*1024*1024+1]).unwrap();out.flush().unwrap();break;},
            "malformed"=>{writeln!(out,"broken").unwrap();out.flush().unwrap();break;},
            "wrong-id"=>{writeln!(out,r#"{{"id":{},"result":{{}}}}"#,identifier+1).unwrap();},
            "bad-result"=>{writeln!(out,r#"{{"id":{identifier},"error":2}}"#).unwrap();},
            _=>{
                if line.contains("\"op\":\"unknown\"") {
                    writeln!(out,r#"{{"id":{identifier},"error":"unknown operation"}}"#).unwrap();
                } else {
                    writeln!(out,r#"{{"id":{identifier},"result":{{"ok":true}}}}"#).unwrap();
                }
            }
        }
        out.flush().unwrap();
    }
}
