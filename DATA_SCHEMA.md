# University data schema

Institution data should be identified by university ID and curriculum version. Missing credits, fees, or grading rules should remain unspecified until confirmed from an authoritative source.

## Programme record

```json
{
  "university_id": "iaa",
  "programme_code": "OFFICIAL_PROGRAMME_CODE",
  "programme_name": "Official programme name",
  "award_level": "certificate|diploma|bachelor|postgraduate",
  "academic_year": "YYYY/YYYY",
  "curriculum_version": "official version or date",
  "modules": [
    {
      "module_code": "OFFICIAL_CODE",
      "module_name": "Official module title",
      "year_or_level": 1,
      "semester": 1,
      "credits": null,
      "grade_scale_id": "iaa-official-grade-scale",
      "source_title": "Official curriculum document",
      "source_file": "filename.pdf",
      "page": null,
      "verified_at": null,
      "status": "unverified"
    }
  ]
}
```

Data should be identified as official only after the source and values have been reviewed. Preserve previous curriculum versions rather than silently replacing them. Fee records should include effective dates, programme, student category, fee item, currency, and source page.
