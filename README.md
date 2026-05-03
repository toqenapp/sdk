# Toqen.app SDK

Status: In Development / Subject to Change

This repository is the public SDK documentation surface for Toqen.app.

Current workspace status: no SDK implementation files were present before documentation was added. Do not assume a package name, installation command, runtime support matrix, or stable API until this repository publishes versioned implementation documentation.

## SDK Scope

This repository should contain SDK-specific documentation only:

- installation instructions once a package exists
- getting started guide
- SDK API reference
- usage examples
- versioning policy
- SDK security considerations
- migration notes

Platform-wide protocol, architecture, trust, privacy, lifecycle, and responsible disclosure documentation belongs in the organization `.github` repository.

## Intended SDK Role

The SDK is intended to help partner applications integrate with Toqen.app authorization flows while keeping sensitive enforcement logic inside Toqen.app server-side services.

The SDK must not embed private backend validation behavior, anti-abuse logic, provider internals, or storage implementation details.

## Current Integration Guidance

Until a stable SDK is published, use Toqen.app-managed integration guidance and the public organization documentation hub.

## Security

Report vulnerabilities privately:

```text
hi@toqen.app
```

See [SECURITY.md](./SECURITY.md).

