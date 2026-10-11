//! Real-artifact embedding bridge for the retrieval matrix. No corpus or gold
//! labels are loaded here, and no metadata is written beside searched sources.
use clap::Parser;
use ixos_protocol::ixos_embed::{EmbeddingModel, Model2VecEmbedder};
use serde::Deserialize;
use serde_json::json;
use std::io::{self, BufRead, Write};
use std::path::PathBuf;
use std::time::Instant;

#[derive(Parser)]
struct Args {
    #[arg(long)]
    model: PathBuf,
    #[arg(long)]
    encoded: bool,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    id: String,
    texts: Vec<String>,
    max_tokens: Option<usize>,
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    let started = Instant::now();
    let model = if args.encoded {
        Model2VecEmbedder::from_path_encoded(&args.model)?
    } else {
        Model2VecEmbedder::from_path(&args.model)?
    };
    let fingerprint = model
        .fingerprint()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<String>();
    eprintln!(
        "{}",
        json!({"type":"ready","fingerprint":fingerprint,"dimensions":model.dimensions(),"tokenizer_settings":model.tokenizer_settings(),"load_ms":started.elapsed().as_secs_f64()*1000.0,"pid":std::process::id()})
    );
    let mut stdout = io::BufWriter::new(io::stdout().lock());
    let mut input = io::stdin().lock();
    loop {
        // Bound a request without first allocating an unbounded read_line buffer.
        let mut data = Vec::new();
        let mut complete = false;
        while !complete {
            let buffer = input.fill_buf()?;
            if buffer.is_empty() {
                break;
            }
            let count = buffer
                .iter()
                .position(|b| *b == b'\n')
                .map(|i| {
                    complete = true;
                    i + 1
                })
                .unwrap_or(buffer.len());
            anyhow::ensure!(
                data.len() + count <= 64 * 1024 * 1024,
                "Embedding request exceeds 64 MiB"
            );
            data.extend_from_slice(&buffer[..count]);
            input.consume(count);
        }
        if data.is_empty() {
            break;
        }
        let request: Request = serde_json::from_slice(&data)?;
        anyhow::ensure!(
            request.texts.len() <= 4096,
            "Too many inputs in one embedding request"
        );
        let began = Instant::now();
        let vectors = model.embed_batch_with_limit(&request.texts, request.max_tokens)?;
        let elapsed = began.elapsed().as_secs_f64() * 1000.0;
        serde_json::to_writer(
            &mut stdout,
            &json!({"id":request.id,"vectors":vectors,"embed_ms":elapsed,"input_bytes":request.texts.iter().map(|s|s.len()).sum::<usize>(),"inputs":request.texts.len(),"max_tokens":request.max_tokens}),
        )?;
        stdout.write_all(b"\n")?;
        stdout.flush()?;
    }
    Ok(())
}
