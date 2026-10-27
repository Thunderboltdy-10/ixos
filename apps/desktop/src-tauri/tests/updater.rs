mod tests {
    use std::io::{Read, Write};
    use tauri_plugin_updater::UpdaterExt;
    #[test]
    fn signed_desktop_update_rejects_tampering_and_version_relabeling() {
        let mut context = tauri::test::mock_context(tauri::test::noop_assets());
        context.config_mut().plugins.0.insert(
            "updater".into(),
            serde_json::json!({
                "pubkey": include_str!("fixtures/updater.pub").trim(),
                "requireSignedVersion": true
            }),
        );
        let app = tauri::test::mock_builder()
            .plugin(tauri_plugin_updater::Builder::new().build())
            .build(context)
            .unwrap();
        for version in ["9.0.0", "10.0.0", "0.0.1"] {
            let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
            let base = format!("http://{}", listener.local_addr().unwrap());
            let data = serde_json::json!({"version": version, "platforms": {"fixture": {
                "url": format!("{base}/update"), "signature": include_str!("fixtures/update.sig").trim()
            }}}).to_string();
            let server = std::thread::spawn(move || {
                let (mut stream, _) = listener.accept().unwrap();
                stream
                    .set_read_timeout(Some(std::time::Duration::from_secs(5)))
                    .unwrap();
                let mut request = [0; 4096];
                let _ = stream.read(&mut request);
                write!(stream, "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", data.len(), data).unwrap();
            });
            let updater = app
                .updater_builder()
                .target("fixture")
                .endpoints(vec![base.parse().unwrap()])
                .unwrap()
                .build()
                .unwrap();
            let update = tauri::async_runtime::block_on(updater.check()).unwrap();
            server.join().unwrap();
            if version == "0.0.1" {
                assert!(update.is_none());
                continue;
            }
            let update = update.unwrap();
            assert_eq!(
                update.verify(b"ixos desktop update fixture").is_ok(),
                version == "9.0.0"
            );
            assert!(update.verify(b"tampered desktop update").is_err());
        }
    }
}
