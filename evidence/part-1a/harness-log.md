# Part 1A Harness Log

Student: complete this log yourself after reviewing the actual machine-generated results in `raw/`.

  Run 
  Date and command 
  Result from raw evidence 
  Genuine failures and repair 

  Student review 

**Outcome:** PASS for the recorded Part 1A automated checks, with the limitations below. This does not establish that the application is free of all defects.

Check 
Recorded result 
|---|---|
| Unit tests | 20 passed, 0 failed (`raw/final-unit-tests.tap`; exit code 0). |
| Independent HTTP harness | 18 passed, 0 failed (`raw/final-harness.json`; exit code 0). |
| 100-task filter and priority sort | 100 tasks processed; 20 expected results; 1.598 ms in the final recorded run, below the approved 1,000 ms limit. |
| ESLint | `pnpm lint` passed (exit code 0). |
| Static analysis | Semgrep Core 1.185.0 fallback ran 68 `p/javascript` rules over six source files, with 0 findings and 0 engine errors. The standard CLI JSON path exited 2 due to a Windows Core RPC `socketpair` error; that CLI path is not reported as passing. |
| Quickstart | Frozen-lockfile install passed. `pnpm start` bound to loopback; GET/POST/GET smoke requests passed using an isolated data file. |
| Generation archives | Initial and final archive manifests were checked against their archive contents: 17/17 and 18/18 entries matched. |

**Review limitations:** These results cover the saved automated checks on this local Windows environment.  . One final harness attempt was blocked by sandbox loopback `EACCES`; the unchanged rerun passed after loopback access was enabled. The original failure and successful reruns remain in `raw/`.

**Assignment status:ACCEPT/REJECT**  ACCEP
