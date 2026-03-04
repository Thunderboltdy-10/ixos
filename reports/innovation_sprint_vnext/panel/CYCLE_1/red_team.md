# Red Team (Trust/Safety) Critique

- Plausible-wrong is the key failure: correct doc in top-k but wrong top1 is still trust loss.
- Sensitive leak metric must remain zero under benign queries.
- Any controller escalating to Pro must not bypass privacy expectations or expose restricted paths.
- Track worst-case examples explicitly, not only averages.
