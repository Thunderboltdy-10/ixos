//! Language adapters and conservative source-unit boundaries.
use super::*;
#[cfg(feature = "evidence-functions")]
use tree_sitter::Language;

impl State {
    #[cfg(not(feature = "evidence-functions"))]
    pub(super) fn parse(&mut self, _path: &str, _doc: &Document, s: &mut Stats) -> Vec<Unit> {
        s.fallbacks += 1;
        Vec::new()
    }
    #[cfg(feature = "evidence-functions")]
    pub(super) fn parse(&mut self, path: &str, doc: &Document, s: &mut Stats) -> Vec<Unit> {
        let ext = std::path::Path::new(path)
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("");
        let lang = match ext {
            "rs" => "rust",
            "py" => "python",
            "ts" => "typescript",
            "tsx" => "tsx",
            "js" | "jsx" => "javascript",
            "go" => "go",
            "cpp" | "cc" | "cxx" | "h" | "hpp" => "cpp",
            "c" => "c",
            "java" => "java",
            "cs" => "csharp",
            "rb" => "ruby",
            _ => {
                s.fallbacks += 1;
                return vec![];
            }
        };
        if !self.parsers.contains_key(lang) {
            let t = Instant::now();
            let grammar: Language = match lang {
                "rust" => tree_sitter_rust::LANGUAGE.into(),
                "python" => tree_sitter_python::LANGUAGE.into(),
                "typescript" => tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into(),
                "tsx" => tree_sitter_typescript::LANGUAGE_TSX.into(),
                "javascript" => tree_sitter_javascript::LANGUAGE.into(),
                "go" => tree_sitter_go::LANGUAGE.into(),
                "cpp" => tree_sitter_cpp::LANGUAGE.into(),
                "c" => tree_sitter_c::LANGUAGE.into(),
                "java" => tree_sitter_java::LANGUAGE.into(),
                "csharp" => tree_sitter_c_sharp::LANGUAGE.into(),
                "ruby" => tree_sitter_ruby::LANGUAGE.into(),
                _ => unreachable!(),
            };
            let mut p = Parser::new();
            if p.set_language(&grammar).is_err() {
                s.fallbacks += 1;
                return vec![];
            }
            #[allow(deprecated)]
            p.set_timeout_micros(50_000);
            self.parsers.insert(lang.into(), p);
            s.parser_init_ms += ms(t);
        }
        let t = Instant::now();
        let parser = self.parsers.get_mut(lang).unwrap();
        parser.reset();
        let tree = parser.parse(doc.text.as_bytes(), None);
        s.parse_ms += ms(t);
        s.parsed_files += 1;
        let Some(tree) = tree else {
            s.fallbacks += 1;
            return vec![];
        };
        let t = Instant::now();
        let mut out = vec![];
        let mut cursor = tree.walk();
        let mut visited = 0;
        loop {
            let n = cursor.node();
            visited += 1;
            if visited > 200_000 || out.len() >= 4096 {
                s.fallbacks += 1;
                return Vec::new();
            }
            if !(n.has_error()
                || n.kind() == "function_definition" && n.child_by_field_name("body").is_none())
                && matches!(
                    n.kind(),
                    "function_item"
                        | "function_definition"
                        | "function_declaration"
                        | "method_definition"
                        | "method_declaration"
                        | "constructor_declaration"
                        | "singleton_method"
                        | "method"
                        | "arrow_function"
                        | "function_expression"
                )
            {
                let binding = if n.kind() == "function_expression"
                    && matches!(lang, "javascript" | "typescript" | "tsx")
                {
                    expression_binding(n)
                } else {
                    None
                };
                let name = if n.kind() == "function_expression" {
                    binding.map(|(name, _)| name)
                } else {
                    n.child_by_field_name("name").or_else(|| {
                        if n.kind() == "function_definition" {
                            let mut d = n.child_by_field_name("declarator")?;
                            while d.kind().contains("declarator") {
                                if let Some(next) = d.child_by_field_name("declarator") {
                                    d = next;
                                } else {
                                    break;
                                }
                            }
                            Some(d)
                        } else if n.kind() == "arrow_function" {
                            n.parent()?.child_by_field_name("name")
                        } else {
                            None
                        }
                    })
                };
                if let Some(name) = name.filter(|name| {
                    name.end_byte() - name.start_byte() <= 384
                        && name.start_position().row <= n.start_position().row + 7
                        && name.end_byte() <= n.end_byte()
                }) {
                    let line = binding.map_or(n.start_position().row + 1, |(_, line)| line);
                    let end =
                        (n.end_position().row + usize::from(n.end_position().column > 0)).max(line);
                    if line <= end && end <= doc.lines.len() {
                        let mut parent = n.parent();
                        let mut scope = None;
                        let mut owner = None;
                        while let Some(p) = parent {
                            if matches!(
                                p.kind(),
                                "impl_item"
                                    | "trait_item"
                                    | "class_declaration"
                                    | "class_definition"
                                    | "class_specifier"
                                    | "struct_specifier"
                            ) {
                                let field = if p.kind() == "impl_item" {
                                    "type"
                                } else {
                                    "name"
                                };
                                owner = p
                                    .child_by_field_name(field)
                                    .and_then(|node| immediate_owner(node, &doc.text));
                                let a = p.start_position().row + 1;
                                if a != line && doc.lines[a - 1].len() <= 1024 {
                                    scope = Some((a, doc.lines[a - 1].clone()));
                                }
                                break;
                            }
                            parent = p.parent();
                        }
                        out.push(Unit {
                            line,
                            end,
                            name: doc.text[name.byte_range()].into(),
                            scope,
                            owner,
                            body_start: implementation_start(n, lang, &doc.text),
                        });
                    }
                }
            }
            if cursor.goto_first_child() {
                continue;
            }
            loop {
                if cursor.goto_next_sibling() {
                    break;
                }
                if !cursor.goto_parent() {
                    out.sort_by_key(|u| u.line);
                    s.locate_ms += ms(t);
                    s.units_seen += out.len();
                    return out;
                }
            }
        }
    }
}

#[cfg(feature = "evidence-functions")]
fn implementation_start(
    function: tree_sitter::Node<'_>,
    language: &str,
    source: &str,
) -> Option<usize> {
    let body = function.child_by_field_name("body")?;
    if language != "python" {
        return Some(body.start_position().row + 1);
    }
    let mut cursor = body.walk();
    let mut statements = body
        .named_children(&mut cursor)
        .filter(|node| node.kind() != "comment");
    let first = statements.next()?;
    let leading_docstring = first.kind() == "expression_statement"
        && first.named_child_count() == 1
        && first
            .named_child(0)
            .is_some_and(|expression| python_docstring(expression, source));
    let implementation = if leading_docstring {
        statements.next()?
    } else {
        first
    };
    Some(implementation.start_position().row + 1)
}

#[cfg(feature = "evidence-functions")]
fn python_docstring(expression: tree_sitter::Node<'_>, source: &str) -> bool {
    match expression.kind() {
        "string" => {
            let Some(text) = source.get(expression.byte_range()) else {
                return false;
            };
            let prefix = text
                .split(['\'', '"'])
                .next()
                .unwrap_or("")
                .to_ascii_lowercase();
            // Formatted strings can execute expressions; byte strings are not
            // Python documentation strings either.
            !prefix.contains(['f', 'b'])
        }
        "concatenated_string" => {
            let mut cursor = expression.walk();
            let all_strings = expression
                .named_children(&mut cursor)
                .all(|child| python_docstring(child, source));
            all_strings
        }
        _ => false,
    }
}

// Accept only the parsed immediate owner. Generic bounds, trait names, and
// arbitrary declaration tokens cannot establish ownership.
#[cfg(feature = "evidence-functions")]
fn immediate_owner(mut node: tree_sitter::Node<'_>, source: &str) -> Option<String> {
    if node.kind() == "generic_type" {
        node = node.child_by_field_name("type")?;
    }
    if !matches!(node.kind(), "identifier" | "type_identifier") {
        return None;
    }
    let name = source.get(node.byte_range())?;
    (!name.is_empty() && name.len() <= 384).then(|| name.to_owned())
}

// An expression has an inspectable identity only when directly bound in source.
// Do not infer a receiver class or resolve computed properties/calls.
#[cfg(feature = "evidence-functions")]
fn expression_binding(function: tree_sitter::Node<'_>) -> Option<(tree_sitter::Node<'_>, usize)> {
    let binding = function.parent()?;
    if function.start_position().row > binding.start_position().row + 7 {
        return None;
    }
    let name = match binding.kind() {
        "variable_declarator" if binding.child_by_field_name("value")?.id() == function.id() => {
            let name = binding.child_by_field_name("name")?;
            (name.kind() == "identifier").then_some(name)?
        }
        "assignment_expression" if binding.child_by_field_name("right")?.id() == function.id() => {
            let mut target = binding.child_by_field_name("left")?;
            let name = if target.kind() == "identifier" {
                target
            } else {
                target.child_by_field_name("property")?
            };
            while target.kind() == "member_expression" {
                if target.child_by_field_name("property")?.kind() != "property_identifier" {
                    return None;
                }
                target = target.child_by_field_name("object")?;
            }
            if target.kind() != "identifier" {
                return None;
            }
            name
        }
        _ => return None,
    };
    Some((name, binding.start_position().row + 1))
}
