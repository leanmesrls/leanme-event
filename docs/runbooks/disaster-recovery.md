# Disaster Recovery Runbook

## Targets (initial)

- RPO: ≤ 24 hours (daily backup)
- RTO: ≤ 4 hours per tenant restore

## Steps

1. Identify tenant
2. Locate verified backup
3. Restore DB to isolated target
4. Restore storage
5. Verify counts + smoke
6. Switch registry refs
7. Audit outcome
