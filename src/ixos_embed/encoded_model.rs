//! Owned encoded rows: decode only vocabulary entries used by the input.
//!
//! Tokenization/pooling semantics follow model2vec-rs 0.1.4 (The Minish Lab,
//! MIT; see docs/licenses/model2vec-rs-MIT.txt). This is a loader experiment,
//! not training, integer inference or memory mapping. Owned bytes avoid mapping
//! lifetime/truncation hazards; no source file is needed after construction.

use super::model::ModelError;
use half::f16;
use half::slice::HalfFloatSliceExt;
use safetensors::{tensor::Dtype, SafeTensors};
use std::{ops::Range, path::Path};
use tokenizers::Tokenizer;

pub(super) struct EncodedModel {
    tokenizer: Tokenizer,
    bytes: Vec<u8>,
    rows: Range<usize>,
    dtype: Dtype,
    dimensions: usize,
    row_count: usize,
    weights: Option<Vec<f32>>,
    mapping: Option<Vec<usize>>,
    normalize: bool,
    median_token_length: usize,
    unknown: u32,
}

impl EncodedModel {
    pub(super) fn load(path: &Path) -> anyhow::Result<(Self, serde_json::Value)> {
        let tokenizer = Tokenizer::from_file(path.join("tokenizer.json"))
            .map_err(|error| anyhow::anyhow!("Tokenizer: {error}"))?;
        let spec: serde_json::Value =
            serde_json::from_slice(&std::fs::read(path.join("tokenizer.json"))?)?;
        let unknown = tokenizer
            .token_to_id(spec["model"]["unk_token"].as_str().unwrap_or("[UNK]"))
            .ok_or_else(|| anyhow::anyhow!("Tokenizer unknown token is absent"))?;
        let settings =
            serde_json::json!({"truncation":spec.get("truncation"),"padding":spec.get("padding")});
        drop(spec);
        // Clone the base vocabulary once, then release its strings before model
        // bytes are allocated. Only integer IDs are needed for row validation.
        let (median_token_length, token_ids) = {
            let vocabulary = tokenizer.get_vocab(false);
            let mut lengths: Vec<_> = vocabulary.keys().map(String::len).collect();
            lengths.sort_unstable();
            let median = lengths.get(lengths.len() / 2).copied().unwrap_or(1);
            let ids: Vec<_> = vocabulary
                .into_values()
                .chain(tokenizer.get_added_tokens_decoder().into_keys())
                .chain(tokenizer.get_padding().map(|padding| padding.pad_id))
                .filter(|id| *id != unknown)
                .collect();
            (median, ids)
        };
        let config: serde_json::Value =
            serde_json::from_slice(&std::fs::read(path.join("config.json"))?)?;
        let normalize = config["normalize"].as_bool().unwrap_or(true);
        let bytes = std::fs::read(path.join("model.safetensors"))?;
        let tensors = SafeTensors::deserialize(&bytes)?;
        let tensor = tensors
            .tensor("embeddings")
            .or_else(|_| tensors.tensor("0"))?;
        let [count, dimensions]: [usize; 2] = tensor.shape().try_into()?;
        anyhow::ensure!(count > 0 && dimensions > 0, "Empty embedding table");
        let dtype = tensor.dtype();
        anyhow::ensure!(
            matches!(dtype, Dtype::F32 | Dtype::F16 | Dtype::I8),
            "Unsupported row dtype: {dtype:?}"
        );
        // SafeTensors has already validated tensor ranges; retain its offset in
        // the owned allocation instead of copying/expanding the entire table.
        let start = (tensor.data().as_ptr() as usize)
            .checked_sub(bytes.as_ptr() as usize)
            .ok_or_else(|| anyhow::anyhow!("Tensor is outside the owned bytes"))?;
        let end = start
            .checked_add(tensor.data().len())
            .filter(|end| *end <= bytes.len())
            .ok_or_else(|| anyhow::anyhow!("Tensor range overflow"))?;
        let weights = tensors
            .tensor("weights")
            .ok()
            .map(|tensor| -> anyhow::Result<Vec<f32>> {
                let raw = tensor.data();
                Ok(match tensor.dtype() {
                    Dtype::F64 => raw
                        .chunks_exact(8)
                        .map(|b| f64::from_le_bytes(b.try_into().unwrap()) as f32)
                        .collect(),
                    Dtype::F32 => raw
                        .chunks_exact(4)
                        .map(|b| f32::from_le_bytes(b.try_into().unwrap()))
                        .collect(),
                    Dtype::F16 => raw
                        .chunks_exact(2)
                        .map(|b| f16::from_le_bytes(b.try_into().unwrap()).to_f32())
                        .collect(),
                    dtype => anyhow::bail!("Unsupported weight dtype: {dtype:?}"),
                })
            })
            .transpose()?;
        let mapping = tensors
            .tensor("mapping")
            .ok()
            .map(|tensor| -> anyhow::Result<Vec<usize>> {
                anyhow::ensure!(
                    tensor.dtype() == Dtype::I32,
                    "Mapping must contain I32 row indices"
                );
                tensor
                    .data()
                    .chunks_exact(4)
                    .map(|b| {
                        let row = i32::from_le_bytes(b.try_into().unwrap());
                        usize::try_from(row).map_err(Into::into)
                    })
                    .collect()
            })
            .transpose()?;
        // Validate every possible tokenizer output before any indexing. Added
        // tokens count too; unknowns are removed before pooling as upstream does.
        for id in token_ids {
            let row = mapping
                .as_ref()
                .and_then(|rows| rows.get(id as usize))
                .copied()
                .unwrap_or(id as usize);
            anyhow::ensure!(row < count, "Token {id} maps outside the embedding table");
        }
        Ok((
            Self {
                tokenizer,
                bytes,
                rows: start..end,
                dtype,
                dimensions,
                row_count: count,
                weights,
                mapping,
                normalize,
                median_token_length,
                unknown,
            },
            settings,
        ))
    }

    pub(super) fn encode(
        &self,
        texts: &[String],
        max_tokens: Option<usize>,
        batch_size: usize,
    ) -> Result<Vec<Vec<f32>>, ModelError> {
        let mut vectors = Vec::with_capacity(texts.len());
        for batch in texts.chunks(batch_size) {
            let inputs: Vec<&str> = batch
                .iter()
                .map(|text| {
                    if let Some(limit) = max_tokens {
                        text.char_indices()
                            .nth(limit.saturating_mul(self.median_token_length))
                            .map(|(end, _)| &text[..end])
                            .unwrap_or(text.as_str())
                    } else {
                        text.as_str()
                    }
                })
                .collect();
            let encodings = self
                .tokenizer
                .encode_batch_fast::<String>(inputs.into_iter().map(Into::into).collect(), false)
                .map_err(|error| ModelError::Inference(format!("Tokenization: {error}")))?;
            for encoding in encodings {
                let ids = encoding
                    .get_ids()
                    .iter()
                    .copied()
                    .filter(|id| *id != self.unknown)
                    .take(max_tokens.unwrap_or(usize::MAX));
                let mut sum = vec![0.0; self.dimensions];
                let mut scratch = if self.dtype == Dtype::F16 {
                    vec![0.0; self.dimensions]
                } else {
                    Vec::new()
                };
                let mut count = 0usize;
                for id in ids {
                    let token = id as usize;
                    let row = self
                        .mapping
                        .as_ref()
                        .and_then(|rows| rows.get(token))
                        .copied()
                        .unwrap_or(token);
                    let scale = self
                        .weights
                        .as_ref()
                        .and_then(|weights| weights.get(token))
                        .copied()
                        .unwrap_or(1.0);
                    if row >= self.row_count {
                        return Err(ModelError::Inference(format!(
                            "Token {id} maps outside the embedding table"
                        )));
                    }
                    let width = self.dtype.size();
                    let start = self.rows.start + row * self.dimensions * width;
                    let raw = &self.bytes[start..start + self.dimensions * width];
                    match self.dtype {
                        Dtype::F32 => {
                            for (out, value) in sum.iter_mut().zip(raw.chunks_exact(4)) {
                                *out += f32::from_le_bytes(value.try_into().unwrap()) * scale;
                            }
                        }
                        Dtype::F16 => {
                            decode_half_row(raw, &mut scratch);
                            for (out, value) in sum.iter_mut().zip(&scratch) {
                                *out += value * scale;
                            }
                        }
                        Dtype::I8 => {
                            for (out, &value) in sum.iter_mut().zip(raw) {
                                *out += f32::from(value as i8) * scale;
                            }
                        }
                        _ => unreachable!("Validated row dtype"),
                    }
                    count += 1;
                }
                for value in &mut sum {
                    *value /= count.max(1) as f32;
                }
                if self.normalize {
                    let norm = sum
                        .iter()
                        .map(|value| value * value)
                        .sum::<f32>()
                        .sqrt()
                        .max(1e-12);
                    for value in &mut sum {
                        *value /= norm;
                    }
                }
                vectors.push(sum);
            }
        }
        Ok(vectors)
    }
}

fn decode_half_row(raw: &[u8], output: &mut [f32]) {
    // Checked alignment plus little-endian gating permits the library's portable
    // SIMD conversion. Unaligned or big-endian data uses the scalar reference.
    #[cfg(target_endian = "little")]
    if let Ok(values) = bytemuck::try_cast_slice::<u8, f16>(raw) {
        values.convert_to_f32_slice(output);
        return;
    }
    for (out, value) in output.iter_mut().zip(raw.chunks_exact(2)) {
        *out = f16::from_le_bytes(value.try_into().unwrap()).to_f32();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ixos_embed::{EmbeddingModel, Model2VecEmbedder};
    use safetensors::tensor::{serialize_to_file, TensorView};

    fn fixture(
        dtype: Dtype,
        weights: Option<Dtype>,
        mapping: bool,
        normalize: bool,
        padding: bool,
        truncation: bool,
    ) -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        let values = [0.0_f32, 0.0, 0.0, 2.0, -3.0, 1.0, -1.0, 4.0, 2.0];
        let raw: Vec<u8> = match dtype {
            Dtype::F32 => values.into_iter().flat_map(f32::to_le_bytes).collect(),
            Dtype::F16 => values
                .into_iter()
                .flat_map(|v| f16::from_f32(v).to_le_bytes())
                .collect(),
            Dtype::I8 => values.into_iter().map(|v| v as i8 as u8).collect(),
            _ => unreachable!(),
        };
        let scales: Vec<u8> = match weights {
            Some(Dtype::F64) => [1.0_f64, 0.25, 0.75]
                .into_iter()
                .flat_map(f64::to_le_bytes)
                .collect(),
            Some(Dtype::F32) => [1.0_f32, 0.25, 0.75]
                .into_iter()
                .flat_map(f32::to_le_bytes)
                .collect(),
            Some(Dtype::F16) => [1.0, 0.25, 0.75]
                .into_iter()
                .flat_map(|v| f16::from_f32(v).to_le_bytes())
                .collect(),
            None => Vec::new(),
            _ => unreachable!(),
        };
        let mapped: Vec<_> = [0_i32, 2, 1]
            .into_iter()
            .flat_map(i32::to_le_bytes)
            .collect();
        let mut tensors = vec![(
            "embeddings",
            TensorView::new(dtype, vec![3, 3], &raw).unwrap(),
        )];
        if let Some(dtype) = weights {
            tensors.push(("weights", TensorView::new(dtype, vec![3], &scales).unwrap()));
        }
        if mapping {
            tensors.push((
                "mapping",
                TensorView::new(Dtype::I32, vec![3], &mapped).unwrap(),
            ));
        }
        serialize_to_file(tensors, &None, &dir.path().join("model.safetensors")).unwrap();
        let mut spec = serde_json::json!({"version":"1.0","truncation":null,"padding":null,"added_tokens":[],
            "normalizer":null,"pre_tokenizer":{"type":"Whitespace"},"post_processor":null,"decoder":null,
            "model":{"type":"WordPiece","unk_token":"[UNK]","continuing_subword_prefix":"##","max_input_chars_per_word":100,
                     "vocab":{"[UNK]":0,"hello":1,"world":2}}});
        if padding {
            spec["padding"] = serde_json::json!({"strategy":"BatchLongest","direction":"Right","pad_to_multiple_of":null,
            "pad_id":1,"pad_type_id":0,"pad_token":"hello"});
        }
        if truncation {
            spec["truncation"] = serde_json::json!({"direction":"Right","max_length":2,"strategy":"LongestFirst","stride":0});
        }
        std::fs::write(
            dir.path().join("tokenizer.json"),
            serde_json::to_vec(&spec).unwrap(),
        )
        .unwrap();
        std::fs::write(
            dir.path().join("config.json"),
            serde_json::to_vec(&serde_json::json!({"normalize":normalize})).unwrap(),
        )
        .unwrap();
        dir
    }

    fn bits(vectors: Vec<Vec<f32>>) -> Vec<Vec<u32>> {
        vectors
            .into_iter()
            .map(|row| row.into_iter().map(f32::to_bits).collect())
            .collect()
    }

    #[test]
    fn half_slice_and_unaligned_fallback_preserve_every_finite_half_value() {
        let values = (0..=u16::MAX)
            .map(f16::from_bits)
            .filter(|value| value.is_finite())
            .collect::<Vec<_>>();
        let raw = values
            .iter()
            .flat_map(|value| value.to_le_bytes())
            .collect::<Vec<_>>();
        let expected = values
            .iter()
            .map(|value| value.to_f32().to_bits())
            .collect::<Vec<_>>();
        let mut decoded = vec![0.0; values.len()];
        decode_half_row(&raw, &mut decoded);
        assert_eq!(
            expected,
            decoded
                .iter()
                .map(|value| value.to_bits())
                .collect::<Vec<_>>()
        );
        let mut unaligned = vec![0_u8; raw.len() + 1];
        let offset = usize::from(unaligned.as_ptr() as usize % 2 == 0);
        unaligned[offset..offset + raw.len()].copy_from_slice(&raw);
        let slice = &unaligned[offset..offset + raw.len()];
        assert_eq!(slice.as_ptr() as usize % 2, 1);
        decode_half_row(slice, &mut decoded);
        assert_eq!(
            expected,
            decoded
                .iter()
                .map(|value| value.to_bits())
                .collect::<Vec<_>>()
        );
    }

    #[test]
    fn configured_padding_outside_vocabulary_is_checked_before_inference() {
        let dir = fixture(Dtype::F16, None, false, true, false, false);
        let mut spec: serde_json::Value =
            serde_json::from_slice(&std::fs::read(dir.path().join("tokenizer.json")).unwrap())
                .unwrap();
        spec["padding"] = serde_json::json!({"strategy":{"Fixed":4},"direction":"Right","pad_to_multiple_of":null,
            "pad_id":999,"pad_type_id":0,"pad_token":"outside"});
        std::fs::write(
            dir.path().join("tokenizer.json"),
            serde_json::to_vec(&spec).unwrap(),
        )
        .unwrap();
        let error = Model2VecEmbedder::from_path_encoded(dir.path())
            .err()
            .expect("Invalid padding must fail loading");
        assert!(
            error.to_string().contains("outside the embedding table"),
            "{error}"
        );
    }

    #[test]
    fn encoded_rows_preserve_reference_f32_bits_and_input_rules() {
        let texts: Vec<_> = [
            "",
            "unknown ðŸ˜€ ä¸­",
            "hello",
            "hello world",
            "hello unknown world",
            "hello\nworld",
            "Ã© hello world",
        ]
        .into_iter()
        .map(str::to_owned)
        .chain(std::iter::once("hello world ".repeat(1200)))
        .collect();
        for dtype in [Dtype::F32, Dtype::F16, Dtype::I8] {
            for weights in [None, Some(Dtype::F16), Some(Dtype::F32), Some(Dtype::F64)] {
                for normalize in [false, true] {
                    let dir = fixture(dtype, weights, true, normalize, false, false);
                    let eager = Model2VecEmbedder::from_path(dir.path()).unwrap();
                    let encoded = Model2VecEmbedder::from_path_encoded(dir.path()).unwrap();
                    assert_eq!(eager.fingerprint(), encoded.fingerprint());
                    assert_eq!(eager.dimensions(), encoded.dimensions());
                    assert_eq!(eager.tokenizer_settings(), encoded.tokenizer_settings());
                    for limit in [None, Some(1), Some(2), Some(512)] {
                        assert_eq!(
                            bits(eager.embed_batch_with_limit(&texts, limit).unwrap()),
                            bits(encoded.embed_batch_with_limit(&texts, limit).unwrap())
                        );
                    }
                    assert_eq!(
                        bits(eager.embed_batch(&texts).unwrap()),
                        bits(encoded.embed_batch(&texts).unwrap())
                    );
                    assert_eq!(
                        bits(vec![eager.embed("hello world").unwrap()]),
                        bits(vec![encoded.embed("hello world").unwrap()])
                    );
                    assert!(encoded.embed_batch_with_limit(&texts, Some(0)).is_err());
                }
            }
        }
    }

    #[test]
    fn inherited_padding_and_truncation_match_reference_batch_semantics() {
        let texts = [
            "hello",
            "hello world",
            "hello world unknown hello world",
            "unknown",
            "",
        ]
        .repeat(30)
        .into_iter()
        .map(str::to_owned)
        .collect::<Vec<_>>();
        for padding in [false, true] {
            for truncation in [false, true] {
                let dir = fixture(Dtype::F16, None, false, true, padding, truncation);
                let eager = Model2VecEmbedder::from_path(dir.path()).unwrap();
                let encoded = Model2VecEmbedder::from_path_encoded(dir.path()).unwrap();
                assert_eq!(eager.tokenizer_settings(), encoded.tokenizer_settings());
                for limit in [None, Some(1), Some(512)] {
                    assert_eq!(
                        bits(eager.embed_batch_with_limit(&texts, limit).unwrap()),
                        bits(encoded.embed_batch_with_limit(&texts, limit).unwrap())
                    );
                }
                assert_eq!(
                    bits(eager.embed_batch(&texts).unwrap()),
                    bits(encoded.embed_batch(&texts).unwrap())
                );
            }
        }
    }

    #[test]
    fn owned_rows_remain_usable_after_fixture_model_is_removed() {
        let dir = fixture(Dtype::I8, Some(Dtype::F32), false, true, false, false);
        let model = Model2VecEmbedder::from_path_encoded(dir.path()).unwrap();
        let before = model.embed("hello world").unwrap();
        std::fs::remove_file(dir.path().join("model.safetensors")).unwrap();
        assert_eq!(before, model.embed("hello world").unwrap());
    }

    #[test]
    fn malformed_tensor_or_token_row_is_a_load_error() {
        let dir = fixture(Dtype::F32, None, false, true, false, false);
        let mut spec: serde_json::Value =
            serde_json::from_slice(&std::fs::read(dir.path().join("tokenizer.json")).unwrap())
                .unwrap();
        spec["model"]["vocab"]["outside"] = serde_json::json!(99);
        std::fs::write(
            dir.path().join("tokenizer.json"),
            serde_json::to_vec(&spec).unwrap(),
        )
        .unwrap();
        assert!(Model2VecEmbedder::from_path_encoded(dir.path()).is_err());
        std::fs::write(dir.path().join("model.safetensors"), b"invalid").unwrap();
        assert!(Model2VecEmbedder::from_path_encoded(dir.path()).is_err());
    }
}
