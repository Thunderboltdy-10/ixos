# **Ixos Strategic Audit: The Post-Index Paradigm and Zero-Storage Sovereignty**

## **Executive Summary: The End of the Index Tax**

The desktop search market is currently defined by a stagnant dichotomy: on one side, legacy indexers like Copernic and Windows Search that demand a heavy "Index Tax"—consuming 30-50% of the original corpus size and hogging system resources—and on the other, privacy-invasive cloud integrations like Microsoft Recall that sacrifice user sovereignty for utility. Our strategic analysis confirms that the Ixos Protocol’s "Zero-Storage" Just-In-Time (JIT) architecture is not merely a technical novelty, but a viable, defensible, and monetizable wedge into a market currently experiencing a violent "Privacy Recoil."  
The core thesis of Ixos relies on a convergence of hardware acceleration and algorithmic efficiency that was impossible just two years ago. The validation of JIT embeddings as a defensible feature rests on the capability to deliver semantic relevance within the "Two-Second Rule" of cognitive tolerance without maintaining a persistent vector database. Our audit, synthesizing data from the LEANN architecture 1, Model2Vec performance benchmarks 2, and the Rhodes JITIR thesis 3, indicates that this is achievable through a specific "Optimized Hybrid Cascade" architecture. By leveraging memory-mapped I/O, 8-bit integer quantization, and speculative lexical funneling, Ixos can reduce a 17-second retrieval workload to sub-2-second latency on consumer hardware.3  
This report outlines the strategic path to dominance. It argues that while JIT embedding generation is becoming commoditized, the *application* of it within a privacy-absolutist, local-first framework is a defensible moat. We propose three novel features—Amnesic Context Windows, The Forensic Canary, and Semantic Grep—to expand the product’s value proposition beyond simple search into high-value knowledge work and security auditing. The following sections detail the market opportunity, technical feasibility, security architecture, and a concrete execution roadmap to validate this post-index paradigm.

## **1\. Market and Strategic Audit: Capitalizing on the Privacy Vacuum**

### **1.1 The Privacy Recoil: A Market in Crisis**

The strategic window for Ixos is defined by a massive, reactionary shift in user sentiment regarding OS-level AI integration, termed here as "Privacy Recoil." The introduction of Microsoft's "Recall" feature—which continuously captures screen snapshots and semantic history—triggered immediate and severe backlash from privacy advocates, security researchers, and enterprise IT administrators.4  
This backlash validates a critical market reality: users demand the utility of semantic recall (e.g., "Find the invoice from last week about the plumbing"), but they violently reject the mechanism of pervasive surveillance required by current implementations. The "always-watching" paradigm creates a liability that enterprises cannot accept due to GDPR/CCPA compliance risks 4 and that power users reject on principle.  
Ixos is uniquely positioned to fill this vacuum. By architecting a system that generates intelligence only at the moment of the query and discards it immediately thereafter (JIT mode), Ixos aligns perfectly with the "Anti-Recall" sentiment. It offers the "magic" of semantic search without the "spyware" anxiety. Market data from the success of privacy-focused search engines like DuckDuckGo and Brave Search 6 suggests a significant and growing cohort of users willing to switch platforms or pay premiums for tools that guarantee data sovereignty.

### **1.2 The "Index Tax" and Economic Friction**

The dominant incumbent architecture (Copernic, Spotlight, Windows Search) relies on maintaining a massive inverted index or vector store. This imposes an "Index Tax" on the user:

* **Storage Cost:** Indices often consume 10-30% of the disk space relative to the corpus. For a developer with 1TB of code and docs, this is 100GB of wasted space.3  
* **Performance Cost:** Background indexing services consume CPU cycles and I/O bandwidth, causing the "fan spin" phenomenon that users detest.  
* **Data Staleness:** Indices are perpetually out of date, requiring constant re-indexing to reflect file changes.

Ixos eliminates this tax. By adopting a "Zero-Storage" philosophy supported by the LEANN architecture findings 1, which prove that recomputing embeddings on-the-fly is often more efficient than storing them due to the high I/O cost of fetching vectors from disk, Ixos transforms search from a stateful burden into a stateless utility. This is a fundamental disruption of the unit economics of desktop search.

### **1.3 Competitive Moat Analysis**

| Competitor | Architecture | Privacy Model | Latency Profile | Strategic Weakness |
| :---- | :---- | :---- | :---- | :---- |
| **Microsoft Recall** | Continuous Snapshotting | Local, Encrypted (Persistent) | Instant | Massive privacy liability; perceived as "spyware".8 Requires NPU hardware.9 |
| **SemTools** | CLI Semantic | Local, Static Embeddings | High (No funnel) | Developer-centric CLI; lacks GUI and ramping UX.10 No hybrid funnel. |
| **Everything** | NTFS MFT Parsing | Local, Filename Only | Instant (\<10ms) | No semantic capability; lexical only. Windows specific.11 |
| **Copernic** | Inverted Index | Local, Heavy Storage | Moderate (100-500ms) | Massive "Index Tax"; legacy UI; expensive enterprise pricing.12 |
| **Raycast** | Extension-based | Hybrid (Cloud/Local) | Instant | Generalist launcher; not a dedicated deep-file search engine. Extensions pose privacy risks.13 |

Is JIT Embeddings Defensible?  
Technically, JIT embedding generation is becoming commoditized via libraries like model2vec and usearch. However, the application of JIT embeddings within a constrained latency budget is highly defensible. The moat for Ixos is not the AI model itself, but the Optimized Hybrid Cascade architecture.3

* **The Funnel:** Competitors like SemTools run semantic search over the entire corpus, resulting in unacceptable latency. Ixos uses a ripgrep-powered lexical funnel to reduce the search space by 97% before engaging the AI.3  
* **Psychophysics:** Utilizing "Ramping Interfaces" to mask the remaining latency is a sophisticated UX strategy rooted in academic research 3 that creates a perceived responsiveness competitors lack.  
* **System Integration:** The specific Rust implementation using mmap for zero-copy loading and Rayon for work-stealing parallelism 3 creates a performance barrier that Electron-based apps cannot replicate.

### **1.4 Monetization Strategy**

The analysis supports a "Pro" monetization model similar to Obsidian or Raycast.14 The protocol and basic CLI should be open/free to establish a standard, while the GUI application captures value through advanced features.

* **Free Tier:** JIT mode, text/code support, basic hybrid search. This acts as the "Trojan Horse" to replace grep and find in developer workflows.  
* **Pro Tier ($7-10/month):**  
  * **Persistent Caching:** For users with massive \>100k file corpora who need xattr-based acceleration.3  
  * **Advanced File Support:** PDF/DOCX extraction 3, which requires maintenance of complex parsers.  
  * **LLM Integration:** Query refinement and "Chat with Data" features using local LLMs (Phi-3).16  
* **Enterprise Tier ($25/user/month):**  
  * **Chain of Custody:** Cryptographic attestation of search results for legal/compliance workflows.3  
  * **Network Drive Support:** Optimized scanning for SMB/NFS shares.

## **2\. Technical Architecture Deep Dive: The Physics of Immediacy**

### **2.1 The Optimized Hybrid Cascade v2.0**

The primary technical risk for JIT search is latency. A purely semantic search over 30,000 files using a transformer model takes \~17 seconds.3 This violates the "Two-Second Rule".3 The Ixos solution is the "Hybrid Cascade," a pipeline that trades strict semantic purity for speed and utility.  
Stage 1: The Speculative Funnel (Lexical Culling)  
The system begins with a lexical pass using ripgrep (librg). This is not merely a fallback; it is a speculative filter. By identifying high-confidence lexical matches in under 200ms 3, the system creates a "Candidate Set" of approximately 1,000 files. This 97% reduction in the search space is the single most critical factor in making JIT viable. It leverages the fact that most user queries contain some lexical overlap with the target document.3  
Stage 2: Semantic Reranking (Model2Vec)  
The Candidate Set is passed to the Model2Vec engine. Unlike traditional Transformers (BERT, MiniLM) which use heavy attention mechanisms (O(n^2) complexity), Model2Vec distills knowledge into static embeddings.2

* **Throughput:** Model2Vec is up to 500x faster than MiniLM on CPU.2  
* **Quantization:** Ixos implements **8-bit integer quantization (int8)**.3 This reduces the model size from \~30MB to \~7.5MB and allows the CPU to use AVX/SIMD instructions to process four times as many data points per cycle. This reduces the embedding time for 1,000 files to \~1.25 seconds.3

### **2.2 Zero-Latency Model Loading (mmap & SafeTensors)**

A major friction point in local AI is the "Cold Start" penalty—the 2-3 seconds required to load model weights into memory. Ixos eliminates this by adopting **Memory-Mapped I/O (mmap)** combined with the **SafeTensors** serialization format.3

* **Mechanism:** mmap maps the model file on disk directly to the process's virtual address space. The OS kernel then pages in the data lazily, only reading the specific weight tensors required for inference.  
* **Implication:** Initialization time drops to the millisecond range. Crucially, because the memory is backed by the file on disk, the OS can aggressively evict these pages under memory pressure without swapping to swap space, allowing the system to remain responsive even on devices with 4GB RAM.3

### **2.3 The LEANN Philosophy and Ephemeral Caching**

The **LEANN** (Low-Storage Vector Index) architecture provides theoretical validation for Ixos's approach. LEANN research demonstrates that graph-based recomputation (computing embeddings on the fly) can reduce storage overhead by 97% while maintaining high recall.1 Ixos adopts this philosophy but modifies it for local filesystems.  
The Content-Addressable Ephemeral Sidecar (LMDB)  
For filesystems that do not support extended attributes (FAT32, SMB), Ixos implements a temporary cache using LMDB.3

* **Performance:** LMDB offers read performance "orders of magnitude" faster than SQLite because it requires no SQL parsing, uses zero-copy data access, and relies on the kernel's page cache.3  
* **Privacy:** The cache maps a 64-bit xxHash3 fingerprint (path \+ mtime) to the embedding. It is strictly capped (e.g., 50MB) and uses an LRU eviction policy. It is deleted upon application exit, maintaining the "Zero-Storage" promise.3

## **3\. Security & Privacy Risk Assessment: The Fortress of Volatility**

### **3.1 Extended Attributes (xattr) and Information Leakage**

The "xattr-Assisted Mode" 3 caches embeddings in filesystem metadata to accelerate repeated searches. While efficient, this introduces specific attack vectors.

* **Leakage via Backup/Sync:** Tools like tar, rsync, Dropbox, or Git may inadvertently capture xattrs, leaking semantic vector data to locations where it was not intended.18 An adversary with access to these vectors could perform "Model Inversion Attacks" to reconstruct parts of the original document.20  
* **Kernel Vulnerabilities:** Recent CVEs (e.g., CVE-2025-40306 in OrangeFS) highlight that xattr handling in kernels can be fragile, leading to buffer overflows or denial of service.22  
* **Malware Obfuscation:** Threat actors like the Lazarus Group utilize xattrs (e.g., com.apple.ResourceFork) to hide malicious payloads.24 While Ixos uses xattrs for storage, it must ensure it does not become a vector for executing such payloads or confuse legitimate security tools.

**Mitigation Strategy:**

1. **Encryption:** All xattr data must be encrypted using **XChaCha20-Poly1305**.26 The key should be ephemeral, derived from a user session, or stored in the OS Keychain, ensuring that leaked xattrs are opaque blobs.  
2. **Signing:** Use Ed25519 signatures to detect tampering or payload injection.3  
3. **Namespacing:** Strictly use user-space namespaces (e.g., user.ixos.embedding) to avoid conflict with system attributes like SELinux or Gatekeeper.28

### **3.2 Memory Scraping and Persistence**

Since JIT relies on processing data in RAM, it is vulnerable to **RAM-scraping malware**.29 If an adversary dumps the process memory, they could retrieve the raw text of files currently being indexed or their embedding vectors.

* **Risk:** Research shows that vector embeddings can be inverted to reveal sensitive personal data (PII).20

**Mitigation Strategy:**

* **SecureBuffer:** Implement a SecureBuffer type in Rust that zeroizes memory immediately upon drop (going out of scope), minimizing the window of exposure.3  
* **Journalist Mode:** A panic-button feature that aggressively purges all memory arenas and deletes the LMDB sidecar, ensuring no forensic artifacts remain.3

### **3.3 Alternate Data Streams (ADS) Risks**

On Windows NTFS, Ixos uses ADS for caching. ADS is notoriously difficult for users to see and is a common hiding spot for malware.30

* **Risk:** Users audit their disk usage and see "0 bytes" for a file that actually has megabytes of ADS data attached, leading to confusion or suspicion.  
* **Mitigation:** Ixos must provide a transparent "Storage Audit" CLI command that explicitly enumerates the space consumed by ADS caches, distinguishing legitimate Ixos data from potential malware.

## **4\. Product Innovation: Novel Feature Proposals**

To differentiate Ixos from being "just another search tool," we propose three novel features that leverage its unique JIT architecture.

### **Feature 1: Amnesic Context Windows (Session-Scoped Search)**

* **One-Sentence Pitch:** "Search that forgets as soon as you do—create a secure, ephemeral workspace for sensitive projects that vanishes without a trace when you close the app."  
* **Why It’s Novel:** Current tools either persist history forever (Recall, Copernic) or have no concept of "session" (grep). This creates a temporary, encrypted RAM-disk context for sensitive tasks (e.g., "M\&A Deal X").  
* **Feasibility:** High. It reuses the existing LMDB ephemeral sidecar logic but keys it to a session ID and stores it in a ramfs or strictly memory-mapped file with O\_TMPFILE (Linux) or FILE\_FLAG\_DELETE\_ON\_CLOSE (Windows).  
* **Security Risks:** Data persistence in swap files.  
  * *Mitigation:* Use mlock to prevent memory from being swapped to disk.32  
* **MVP Spec:**  
  * **Input:** CLI flag \--session "Project Alpha".  
  * **Behavior:** Spawns a daemon with an in-memory LMDB. All embeddings generated are stored here.  
  * **Cleanup:** On SIGINT or exit, the encryption key is dropped from memory, rendering any paged data useless. The OS handles file deletion.  
* **Required Experiments:** Verify mlock behavior across Windows/macOS/Linux to ensure swap prevention.

### **Feature 2: The Forensic Canary (Tamper-Evident Indexing)**

* **One-Sentence Pitch:** "Search that doubles as a tripwire—know instantly if your archived files have been silently modified since you last looked."  
* **Why It’s Novel:** Search engines assume file staticity. Ixos verifies it. By using the SHA256 hashing already required for the "Secure Ranking" 3, Ixos can flag files that have bit-rotted or been tampered with.  
* **Feasibility:** Medium. Requires persisting a lightweight Merkle tree or hash list ( \< 5MB for 100k files).  
* **Security Risks:** False positives from system updates.  
  * *Mitigation:* Filter by file type (focus on documents/code, ignore system binaries).  
* **MVP Spec:**  
  * **Input:** ixos verify./archive-folder.  
  * **Behavior:** Scans directory, computes SHA256 hashes, compares against the last known state stored in the xattr/ADS cache.  
  * **Output:** A list of "Modified," "Corrupted," or "New" files.  
  * **UI:** A "Modified" badge in search results.  
* **Required Experiments:** Measure the hashing speed impact on search latency (SHA256 is fast, but 1000 files adds up).

### **Feature 3: Semantic Grep (sgrep) \- The Pipeable Intelligence**

* **One-Sentence Pitch:** "Bring LLM intelligence to your Unix pipes—filter logs, code, or API responses by meaning, not just regex: cat logs.txt | sgrep 'database errors'."  
* **Why It’s Novel:** SemTools exists but is heavy and agentic.10 sgrep would be a lightweight, single-binary tool optimized for STDIN/STDOUT piping, leveraging the mmap/int8 optimizations of Ixos.  
* **Feasibility:** High. The core Model2Vec and ranker logic is already decoupled in Rust.  
* **Security Risks:** Input injection attacks via STDIN.  
  * *Mitigation:* Treat all STDIN as untrusted data; limit buffer sizes.  
* **MVP Spec:**  
  * **Command:** sgrep\[FILE\].  
  * **Behavior:** Reads line by line (or chunk by chunk), computes embedding, compares cosine similarity to query vector.  
  * **Output:** Lines/blocks exceeding a similarity threshold (default 0.7).  
  * **Performance:** Throughput \> 10MB/s on standard CPU.  
* **Required Experiments:** Benchmark sgrep against grep for latency and against llm CLI tools for accuracy.

## **5\. User Experience Strategy: Psychophysics of Search**

### **5.1 The Two-Second Rule and Ramping Interfaces**

Research by Rhodes (2000) on Just-In-Time Information Retrieval establishes the "Two-Second Rule": users will abandon a task if the response delay exceeds two seconds, but they will tolerate longer processing if initial feedback is provided immediately.3  
Ixos implements a **Four-Stage Ramping Interface** 3 to align with this cognitive threshold:

1. **Instant Echo (0-50ms):** The UI immediately reflects the query and shows matches from an in-memory history buffer. This acknowledges the input, creating the perception of instant responsiveness.  
2. **Lexical Stream (50-500ms):** Results from ripgrep are streamed directly to the UI via Tauri Channels. This populates the list with relevant (though text-only) matches, occupying the user's attention while the semantic engine warms up.  
3. **Semantic Injection (500-2000ms):** As Model2Vec completes processing the candidate set, semantic matches are injected into the result list. To prevent "layout thrashing" (where items jump around), Ixos uses a "gentle drift" animation.3  
4. **Deep Search Tail (2s+):** If the search continues, a non-intrusive "New Insight Found" badge appears, allowing the user to choose whether to refresh the view.

### **5.2 High-Velocity Streaming with Tauri Channels**

To support this ramping interface, the frontend must handle high-frequency updates without freezing. Traditional JSON serialization in Electron/Tauri apps bottlenecks at high event rates. Ixos uses **Tauri 2.0 Channels** with a **Batcher** that groups results (e.g., every 50ms or 20 items).3 This ensures a consistent 60fps frame rate.

## **6\. Actionable Research Plan**

### **Phase 1: Performance Validation (Weeks 1-2)**

**Goal:** Validate the "Two-Second" claim on constrained hardware.

* **Task:** **Low-Spec Stress Test.**  
  * *Setup:* Raspberry Pi 4 (4GB RAM) or VM with limited resources.  
  * *Dataset:* Enron Email Dataset (subset of 30k text files).  
  * *Execution:* Run Ixos prototype. Measure Time to First Result (TTFR) and Time to Semantic Interaction (TTSI).  
  * *Metric:* Target TTFR \< 200ms, TTSI \< 2s.  
  * *Reading:* Review *LEANN* paper 1 for graph pruning comparisons.  
* **Task:** **Quantization Quality Audit.**  
  * *Experiment:* Compare model2vec f32 vs. int8 embeddings on the MTEB retrieval benchmark.  
  * *Metric:* Ensure recall degradation is \< 5%.2

### **Phase 2: Security & Privacy Hardening (Weeks 3-4)**

**Goal:** Ensure the "Fortress of Volatility."

* **Task:** **Red Team Self-Audit.**  
  * *Experiment:* Attempt to inject a mock payload (e.g., a shell script) into a custom xattr and see if Ixos executes it or if standard AV flags it.24  
  * *Experiment:* Verify SecureBuffer efficacy. Use a debugger (GDB) to inspect heap dumps after a search session to ensure vectors are zeroed.  
* **Task:** **Prototype Forensic Canary.**  
  * *Code:* Implement a simple SHA256 scanner using the ring or sha2 crate and store results in the LMDB sidecar.

### **Phase 3: Market & User Testing (Weeks 5-6)**

**Goal:** Validate the "Privacy Recoil" messaging.

* **Task:** **Positioning Test.**  
  * *Content:* Draft a landing page contrasting Ixos with Microsoft Recall. Tagline: "They screenshot your life; we just find your files."  
  * *Experiment:* Run A/B tests on Reddit communities (r/privacy, r/selfhosted, r/datahoarder). Measure CTR and waitlist signups.  
* **Task:** **Ramping Interface Tuning.**  
  * *User Testing:* Conduct sessions with 5 users. Vary the delay of "Semantic Injection" (200ms vs 500ms vs 800ms).  
  * *Metric:* Qualitative feedback on "layout thrashing" vs. "perceived speed."

### **Metrics to Validate Viability**

1. **Retention:** Do users return for *lexical* searches (replacing grep/Spotlight) or only for complex *semantic* queries? High lexical usage indicates the UX is frictionless.  
2. **Latency Distribution:** P95 latency on user hardware (measured via local logs, opt-in).  
3. **Storage Footprint:** Average storage overhead per 10k files (Goal: \<50MB ephemeral).

## **Conclusion**

JIT embeddings are not just a defensible feature; they are the *only* viable architecture for a privacy-first, local-only search tool in the post-Recall era. The heavy lifting is not in the AI model itself—which is becoming a commodity—but in the systems engineering (mmap, zero-copy, int8) that allows that model to run invisibly. By strictly adhering to the "Two-Second Rule" and leveraging the "Privacy Recoil," Ixos can carve out a lucrative niche as the professional's choice for sovereign data retrieval. The proposed "Hybrid Cascade" architecture effectively neutralizes the "Index Tax," solving the primary friction point that has held back desktop search for twenty years. The addition of "Forensic Canary" and "Amnesic Context Windows" transforms the tool from a passive utility into an active security asset, creating a compelling value proposition for the privacy-conscious knowledge worker.  
---

Report compiled by:  
Technical Product Strategist & Research Co-Founder  
January 2026

#### **Works cited**

1. LEANN: A Low-Storage Vector Index \- arXiv, accessed January 11, 2026, [https://arxiv.org/html/2506.08276v1](https://arxiv.org/html/2506.08276v1)  
2. MinishLab/model2vec: Fast State-of-the-Art Static Embeddings \- GitHub, accessed January 11, 2026, [https://github.com/MinishLab/model2vec](https://github.com/MinishLab/model2vec)  
3. Research Paper.pdf  
4. Microsoft's Controversial AI Tool Recall Returns Amid Privacy Concerns \- This Week Health, accessed January 11, 2026, [https://thisweekhealth.com/news\_story/microsofts-controversial-ai-tool-recall-returns-amid-privacy-concerns/](https://thisweekhealth.com/news_story/microsofts-controversial-ai-tool-recall-returns-amid-privacy-concerns/)  
5. Microsoft's Windows 11 Recall: Revolution or Privacy Nightmare? \- nGuard, accessed January 11, 2026, [https://nguard.com/sa-microsofts-recall-saga-continuous-coverage-and-latest-news/](https://nguard.com/sa-microsofts-recall-saga-continuous-coverage-and-latest-news/)  
6. \- 12 Privacy-Focused Search Engines for the Future | SEO 101 \- GrackerAI, accessed January 11, 2026, [https://gracker.ai/seo-101/12-privacy-focused-search-engines-for-the-future](https://gracker.ai/seo-101/12-privacy-focused-search-engines-for-the-future)  
7. The Rise of Privacy-First Search Engines: Should Google Be Worried?, accessed January 11, 2026, [https://thriveagency.com/news/the-rise-of-privacy-first-search-engines-should-google-be-worried/](https://thriveagency.com/news/the-rise-of-privacy-first-search-engines-should-google-be-worried/)  
8. Microsoft Revamps Controversial AI-Powered Recall Feature Amid Privacy Concerns, accessed January 11, 2026, [https://thehackernews.com/2024/06/microsoft-revamps-controversial-ai.html](https://thehackernews.com/2024/06/microsoft-revamps-controversial-ai.html)  
9. Microsoft Rolls Recall Feature Out to General Public After Privacy Backlash \- TechRepublic, accessed January 11, 2026, [https://www.techrepublic.com/article/news-microsoft-recall-expands-rollout/](https://www.techrepublic.com/article/news-microsoft-recall-expands-rollout/)  
10. run-llama/semtools: Semantic search and document parsing tools for the command line \- GitHub, accessed January 11, 2026, [https://github.com/run-llama/semtools](https://github.com/run-llama/semtools)  
11. Everything (software) \- Wikipedia, accessed January 11, 2026, [https://en.wikipedia.org/wiki/Everything\_(software)](https://en.wikipedia.org/wiki/Everything_\(software\))  
12. Copernic Desktop Search pricing, accessed January 11, 2026, [https://copernic.com/en/desktop/pricing/](https://copernic.com/en/desktop/pricing/)  
13. Raycast Mac: The Indispensable Productivity Partner for AI Users, accessed January 11, 2026, [https://skywork.ai/skypage/en/Raycast-Mac-The-Indispensable-Productivity-Partner-for-AI-Users/1972905269179510784](https://skywork.ai/skypage/en/Raycast-Mac-The-Indispensable-Productivity-Partner-for-AI-Users/1972905269179510784)  
14. A complete guide to Obsidian pricing in 2025 \- eesel AI, accessed January 11, 2026, [https://www.eesel.ai/blog/obsidian-pricing](https://www.eesel.ai/blog/obsidian-pricing)  
15. Raycast Pricing: Free Forever or Pro with AI for $8/month, accessed January 11, 2026, [https://www.raycast.com/pricing](https://www.raycast.com/pricing)  
16. Phi AI Models 2025: Microsoft's Revolutionary Small Language Models for Education, accessed January 11, 2026, [https://local-ai-zone.github.io/brands/phi-ai-microsoft-efficient-guide-2025.html](https://local-ai-zone.github.io/brands/phi-ai-microsoft-efficient-guide-2025.html)  
17. Supercharge Your Transformers with Model2Vec: Shrink by 50x, Run 500x Faster \- Medium, accessed January 11, 2026, [https://medium.com/@hrishikesh19202/supercharge-your-transformers-with-model2vec-shrink-by-50x-run-500x-faster-c640c6bc1a42](https://medium.com/@hrishikesh19202/supercharge-your-transformers-with-model2vec-shrink-by-50x-run-500x-faster-c640c6bc1a42)  
18. Extended attributes \- ArchWiki, accessed January 11, 2026, [https://wiki.archlinux.org/title/Extended\_attributes](https://wiki.archlinux.org/title/Extended_attributes)  
19. What are costs of storing xattrs on ext4, btrfs filesystems? \- Unix & Linux Stack Exchange, accessed January 11, 2026, [https://unix.stackexchange.com/questions/390274/what-are-costs-of-storing-xattrs-on-ext4-btrfs-filesystems](https://unix.stackexchange.com/questions/390274/what-are-costs-of-storing-xattrs-on-ext4-btrfs-filesystems)  
20. LLM08:2025 Vector and Embedding Weaknesses \- OWASP Gen AI Security Project, accessed January 11, 2026, [https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/](https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/)  
21. Protecting AI Vector Embeddings in MySQL: Security Risks, Database Protection, and Best Practices \- Oracle Blogs, accessed January 11, 2026, [https://blogs.oracle.com/mysql/protecting-ai-vector-embeddings-in-mysql-security-risks-database-protection-and-best-practices](https://blogs.oracle.com/mysql/protecting-ai-vector-embeddings-in-mysql-security-risks-database-protection-and-best-practices)  
22. CVE-2025-40306 | Tenable®, accessed January 11, 2026, [https://www.tenable.com/cve/CVE-2025-40306](https://www.tenable.com/cve/CVE-2025-40306)  
23. CVE-2025-40306 Common Vulnerabilities and Exposures | SUSE, accessed January 11, 2026, [https://www.suse.com/security/cve/CVE-2025-40306.html](https://www.suse.com/security/cve/CVE-2025-40306.html)  
24. Hidden World of xattr: Lazarus Group's Abuse of "Rustyattr" to Evade Detection, accessed January 11, 2026, [https://denwp.com/xattr-lazarus-groups-abuse-rustyattr/](https://denwp.com/xattr-lazarus-groups-abuse-rustyattr/)  
25. xattr'd and Dangerous: Living Off the Fork on macOS \- hxr1, accessed January 11, 2026, [https://hxr1.ghost.io/xattrd-and-dangerous-living-off-the-fork-on-macos/](https://hxr1.ghost.io/xattrd-and-dangerous-living-off-the-fork-on-macos/)  
26. ChaCha20-Poly1305 \- Wikipedia, accessed January 11, 2026, [https://en.wikipedia.org/wiki/ChaCha20-Poly1305](https://en.wikipedia.org/wiki/ChaCha20-Poly1305)  
27. HTTPCrypt Encryption Protocol \- Rspamd Documentation, accessed January 11, 2026, [https://docs.rspamd.com/developers/encryption/](https://docs.rspamd.com/developers/encryption/)  
28. Hide Artifacts: Extended Attributes, Sub-technique T1564.014 \- MITRE ATT\&CK®, accessed January 11, 2026, [https://attack.mitre.org/techniques/T1564/014/](https://attack.mitre.org/techniques/T1564/014/)  
29. Target Breach: 8 Facts On Memory-Scraping Malware \- Dark Reading, accessed January 11, 2026, [https://www.darkreading.com/cyberattacks-data-breaches/target-breach-8-facts-on-memory-scraping-malware](https://www.darkreading.com/cyberattacks-data-breaches/target-breach-8-facts-on-memory-scraping-malware)  
30. Alternate data streams and cybersecurity vulnerabilities \- IBM Developer, accessed January 11, 2026, [https://developer.ibm.com/articles/alternate-data-streams/](https://developer.ibm.com/articles/alternate-data-streams/)  
31. Windows ::DATA Alternate Data Stream \- OWASP Foundation, accessed January 11, 2026, [https://owasp.org/www-community/attacks/Windows\_alternate\_data\_stream](https://owasp.org/www-community/attacks/Windows_alternate_data_stream)  
32. Filesystem-level encryption (fscrypt) \- The Linux Kernel documentation, accessed January 11, 2026, [https://docs.kernel.org/filesystems/fscrypt.html](https://docs.kernel.org/filesystems/fscrypt.html)