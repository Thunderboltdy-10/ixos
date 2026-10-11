import unittest
from scripts.qasper.contract import render, references, score, checked_views, answerability


def fixture(paragraphs):
    return {'title':'Title','abstract':'Abstract','full_text':[{'section_name':'Body','paragraphs':paragraphs}]}


def question(evidence,unanswerable=False):
    return {'answers':[{'annotation_id':'a','answer':{'unanswerable':unanswerable,'evidence':evidence,
            'extractive_spans':[],'free_form_answer':'answer' if not unanswerable else '', 'yes_no':None}}]}


class ContractTests(unittest.TestCase):
    def test_missing_heading_retains_original_paragraphs(self):
        data = fixture(['unchanged paragraph'])
        data['full_text'][0]['section_name']=None
        paper = render('1234.12345',data)
        self.assertEqual(paper.paragraphs[0]['text'],'unchanged paragraph')
        self.assertEqual(len(paper.paragraphs),1)

    def test_unicode_offsets_are_bytes_and_source_exact(self):
        paper = render('1234.12345',fixture(['🙂 café 東京','later topic']))
        paragraph = paper.paragraphs[0]
        self.assertEqual(paper.raw[paragraph['start']:paragraph['end']].decode(),'🙂 café 東京')
        self.assertEqual(paragraph['end']-paragraph['start'],len('🙂 café 東京'.encode()))
        refs = references(question(['🙂 café 東京']),paper)
        result = score(refs,paper,[(paragraph['start'],paragraph['end'])])
        self.assertEqual(result['text_unit_f1'],1)
        self.assertEqual(result['byte_recall'],1)

    def test_partial_view_cannot_claim_a_whole_paragraph(self):
        paper = render('1234.12345',fixture(['first line\nimportant last line']))
        refs = references(question(['first line\nimportant last line']),paper)
        part = paper.paragraphs[0]
        result = score(refs,paper,[(part['start'],part['start']+len('first line'))])
        self.assertEqual(result['text_unit_f1'],0)
        self.assertEqual(result['text_unit_contact'],1)
        self.assertLess(result['byte_recall'],1)

    def test_fabricated_or_truncated_line_rejected(self):
        paper = render('1234.12345',fixture(['source text']))
        lines = paper.raw.decode().split('\n')
        index = lines.index('source text')+1
        row = {'path':'paper.txt','view':{'path':'paper.txt','start_line':index,'end_line':index,'text':'source text'}}
        intervals = checked_views({'results':[row]},paper)
        self.assertEqual(intervals,[(paper.paragraphs[0]['start'],paper.paragraphs[0]['end'])])
        row['view']['text']='source'
        with self.assertRaises(ValueError):
            checked_views({'results':[row]},paper)

    def test_duplicate_locations_cannot_inflate_gold_or_exposure(self):
        paper = render('1234.12345',fixture(['repeated','repeated','other']))
        refs = references(question(['repeated','repeated']),paper)
        self.assertEqual(len(refs[0]['matches']['repeated']),2)
        second = paper.paragraphs[1]
        result = score(refs,paper,[(second['start'],second['end'])]*3)
        self.assertEqual(result['byte_recall'],1)
        self.assertEqual(result['text_unit_f1'],1)

    def test_missing_gold_is_retained_and_never_normalized_into_a_match(self):
        paper = render('1234.12345',fixture(['exact paragraph']))
        refs = references(question([' exact paragraph']),paper)
        self.assertEqual(refs[0]['unmatched'],1)
        self.assertIsNone(score(refs,paper,[(0,len(paper.raw))])['byte_recall'])

    def test_no_answer_negative_boolean_and_mixed_are_distinct(self):
        paper = render('1234.12345',fixture(['text']))
        unanswered = references(question([],True),paper)
        self.assertEqual(answerability(unanswered),'unanswerable')
        negative = question([])
        negative['answers'][0]['answer']['free_form_answer']=''
        negative['answers'][0]['answer']['yes_no']=False
        refs = references(negative,paper)
        self.assertEqual(answerability(refs),'answerable')
        self.assertEqual(refs[0]['answer_type'],'no')
        self.assertEqual(answerability(unanswered+refs),'mixed')
        self.assertIsNone(score(unanswered,paper,[])['text_unit_f1'])

    def test_floats_do_not_masquerade_as_text_paragraphs(self):
        paper = render('1234.12345',fixture(['text']))
        refs = references(question(['FLOAT SELECTED: Table 1','text']),paper)
        self.assertEqual(refs[0]['floats'],['FLOAT SELECTED: Table 1'])
        self.assertEqual(score(refs,paper,[(0,len(paper.raw))])['strict_text_references'],0)

    def test_best_reference_not_union_of_incompatible_annotations(self):
        paper = render('1234.12345',fixture(['a','b']))
        refs = references(question(['a']),paper)+references(question(['b']),paper)
        part = paper.paragraphs[0]
        self.assertEqual(score(refs,paper,[(part['start'],part['end'])])['text_unit_f1'],1)

    def test_section_heading_evidence_has_exact_distinct_coordinates(self):
        paper = render('1234.12345',fixture(['paragraph body']))
        refs = references(question(['Body']),paper)
        self.assertEqual(refs[0]['matches']['Body'],['0:heading'])
        heading = paper.headings[0]
        self.assertEqual(score(refs,paper,[(heading['start'],heading['end'])])['text_unit_f1'],1)

    def test_zero_evidence_and_file_only_are_not_answer_success(self):
        paper = render('1234.12345',fixture(['text']))
        self.assertEqual(checked_views({'results':[{'path':'paper.txt','evidence_omitted':True}]},paper),[])
        self.assertEqual(score(references(question(['text']),paper),paper,[])['byte_recall'],0)

    def test_unsafe_identifier_and_crlf_rejected_before_coordinates(self):
        with self.assertRaises(ValueError):
            render('../paper',fixture(['text']))
        with self.assertRaises(ValueError):
            render('1234.12345',fixture(['text\r\ntext']))


if __name__=='__main__':
    unittest.main()
