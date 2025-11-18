# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e4]:
    - generic [ref=e5]:
      - heading "Logga in" [level=3] [ref=e7]
      - generic [ref=e9]:
        - generic [ref=e10]:
          - generic [ref=e11]: E-post
          - textbox "E-post" [ref=e12]:
            - /placeholder: Ange din e-post
        - generic [ref=e13]:
          - generic [ref=e14]: Lösenord
          - textbox "Lösenord" [ref=e15]:
            - /placeholder: Ange ditt lösenord
        - button "Logga in" [ref=e16]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e22] [cursor=pointer]:
    - generic [ref=e25]:
      - text: Rendering
      - generic [ref=e26]:
        - generic [ref=e27]: .
        - generic [ref=e28]: .
        - generic [ref=e29]: .
  - alert [ref=e30]
```