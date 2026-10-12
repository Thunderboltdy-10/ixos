# Benchmark control attribution

These receipts concern one excluded SWE-bench development environment control. They are not original Ixos task data or an Ixos-authored patch.

- SWE-bench by Carlos E Jimenez, John Yang, Alexander Wettig, Shunyu Yao, Kexin Pei, Ofir Press and Karthik R Narasimhan: [official source](https://github.com/SWE-bench/SWE-bench/tree/02e7a74ffd0b707aab73d203fe87bdc7c76afc8e), [evaluation instructions](https://www.swebench.com/SWE-bench/guides/evaluation/). MIT harness notice is preserved in [SWE-BENCH-MIT.txt](licenses/SWE-BENCH-MIT.txt).
- Canonical dataset: [SWE-bench/SWE-bench, pinned revision](https://huggingface.co/datasets/SWE-bench/SWE-bench/tree/c6fe717fd7a4c3ac1daa4055a4fd082c6a1d28a2). The pinned card contains no license metadata; none is assigned here. Full parquet/issue text is not redistributed in this gate. Earlier original dev data: [princeton-nlp/SWE-bench revision](https://huggingface.co/datasets/princeton-nlp/SWE-bench/tree/e48e2bd1e9fecd5bbd641e9414ac59da9f2e69f6).
- Marshmallow source/test/reference excerpts in logs and the gold patch retain Steven Loria and contributors' [original MIT license](https://github.com/marshmallow-code/marshmallow/blob/5a10e83c557d2ee97799c2b85bec49fc90381656/LICENSE), copied exactly to [MARSHMALLOW-MIT.txt](licenses/MARSHMALLOW-MIT.txt). The original upstream fix is attributed to its source, not Ixos or the current actor.
- uv runtime: [Astral release0.13.0](https://github.com/astral-sh/uv/releases/tag/0.13.0). Its release-asset digest is verified in `inputs.json`; no vendor binary is redistributed. Installed dependencies retain their upstream licenses and are not copied into the repository.

`capture.json` binds copied bytes to native local paths and upstream notice/card URLs. Model weights, full corpora, private application/authorship notes and downloaded executables remain excluded.
