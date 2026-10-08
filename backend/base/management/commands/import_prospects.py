"""Load researched vendor prospects from JSON into the isolated VendorProspect table.

    python manage.py import_prospects pilot/prospects/tambaram-halls.json [--dry-run]

Safe to re-run: the same source listing updates its prospect, the same business seen on another source is
merged into it, and a person's decision is never overwritten. Never creates a User, Product, Service or Review.
"""
import json

from django.core.management.base import BaseCommand, CommandError

from base import prospects


class Command(BaseCommand):
    help = 'Import vendor prospects (internal research data) from a JSON list. Never touches public listings.'

    def add_arguments(self, parser):
        parser.add_argument('paths', nargs='+', help='JSON file(s): a list of prospect records')
        parser.add_argument('--dry-run', action='store_true', help='Evaluate and report, then roll back')
        parser.add_argument('--report', help='write one evaluated summary per record to this JSON file')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        records = []
        for path in options['paths']:
            try:
                with open(path, encoding='utf-8') as fh:
                    data = json.load(fh)
            except (OSError, ValueError) as exc:
                raise CommandError(f'{path}: {exc}')
            if not isinstance(data, list):
                raise CommandError(f'{path}: expected a JSON list of records')
            records += data
        if not records:
            raise CommandError('no records to import')
        report = [] if options.get('report') else None
        counts = prospects.import_records(records, dry_run=dry_run, report=report)
        if report is not None:
            with open(options['report'], 'w', encoding='utf-8') as fh:
                json.dump(report, fh, indent=1, ensure_ascii=False)
        prefix = 'DRY RUN (rolled back): ' if dry_run else ''
        self.stdout.write(prefix + ', '.join(f'{k}={v}' for k, v in counts.items()))
