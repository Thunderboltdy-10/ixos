#!/bin/bash
set -uxo pipefail
source /opt/miniconda3/bin/activate
conda activate testbed
cd /testbed
git config --global --add safe.directory /testbed
cd /testbed
git status
git show
git -c core.fileMode=false diff 5a10e83c557d2ee97799c2b85bec49fc90381656
source /opt/miniconda3/bin/activate
conda activate testbed
python -m pip install -e '.[dev]'
git checkout 5a10e83c557d2ee97799c2b85bec49fc90381656 tests/test_validate.py
git apply -v - <<'EOF_114329324912'
diff --git a/tests/test_validate.py b/tests/test_validate.py
--- a/tests/test_validate.py
+++ b/tests/test_validate.py
@@ -75,6 +75,9 @@ def test_url_absolute_invalid(invalid_url):
         "http://example.com/./icons/logo.gif",
         "ftp://example.com/../../../../g",
         "http://example.com/g?y/./x",
+        "/foo/bar",
+        "/foo?bar",
+        "/foo?bar#baz",
     ],
 )
 def test_url_relative_valid(valid_url):
@@ -104,6 +107,48 @@ def test_url_relative_invalid(invalid_url):
         validator(invalid_url)
 
 
+@pytest.mark.parametrize(
+    "valid_url",
+    [
+        "/foo/bar",
+        "/foo?bar",
+        "?bar",
+        "/foo?bar#baz",
+    ],
+)
+def test_url_relative_only_valid(valid_url):
+    validator = validate.URL(relative=True, absolute=False)
+    assert validator(valid_url) == valid_url
+
+
+@pytest.mark.parametrize(
+    "invalid_url",
+    [
+        "http//example.org",
+        "http://example.org\n",
+        "suppliers.html",
+        "../icons/logo.gif",
+        "icons/logo.gif",
+        "../.../g",
+        "...",
+        "\\",
+        " ",
+        "",
+        "http://example.org",
+        "http://123.45.67.8/",
+        "http://example.com/foo/bar/../baz",
+        "https://example.com/../icons/logo.gif",
+        "http://example.com/./icons/logo.gif",
+        "ftp://example.com/../../../../g",
+        "http://example.com/g?y/./x",
+    ],
+)
+def test_url_relative_only_invalid(invalid_url):
+    validator = validate.URL(relative=True, absolute=False)
+    with pytest.raises(ValidationError):
+        validator(invalid_url)
+
+
 @pytest.mark.parametrize(
     "valid_url",
     [
@@ -170,10 +215,21 @@ def test_url_custom_message():
 def test_url_repr():
     assert repr(
         validate.URL(relative=False, error=None)
-    ) == "<URL(relative=False, error={!r})>".format("Not a valid URL.")
+    ) == "<URL(relative=False, absolute=True, error={!r})>".format("Not a valid URL.")
     assert repr(
         validate.URL(relative=True, error="foo")
-    ) == "<URL(relative=True, error={!r})>".format("foo")
+    ) == "<URL(relative=True, absolute=True, error={!r})>".format("foo")
+    assert repr(
+        validate.URL(relative=True, absolute=False, error="foo")
+    ) == "<URL(relative=True, absolute=False, error={!r})>".format("foo")
+
+
+def test_url_rejects_invalid_relative_usage():
+    with pytest.raises(
+        ValueError,
+        match="URL validation cannot set both relative and absolute to False",
+    ):
+        validate.URL(relative=False, absolute=False)
 
 
 @pytest.mark.parametrize(

EOF_114329324912
: '>>>>> Start Test Output'
pytest -rA tests/test_validate.py
SWEBENCH_TEST_EXIT_CODE=$?
: '>>>>> End Test Output'
echo ">>>>> Test Exit Code: $SWEBENCH_TEST_EXIT_CODE"
git checkout 5a10e83c557d2ee97799c2b85bec49fc90381656 tests/test_validate.py
