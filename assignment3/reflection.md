I built Card Game 24 by taking on the role of an architect and product tester, guiding
Claude step-by-step rather than asking it to generate everything in one go. We tackled the
project in deliberate phases, first setting up a modular Python CLI version (card24.py), then
porting the entire logic into a responsive, single-file web app (index.html). Whenever the AI
hit a wall or took a shortcut, I stepped in to refine the approach. For instance, to avoid
using unsafe eval() functions, I had the AI implement a custom recursive descent parser
that safely validates user input. When testing tricky hands like [3, 3, 8, 8], standard floatingpoint math kept giving rounding errors like 24.000000000000004, so I pushed us to rebuild
the evaluation engine around exact fraction arithmetic. On the front end, I caught a jarring
UX issue where "unsolvable hand" alerts popped up before the card dealing animations
even finished, so I had the AI tweak the event timing for a smoother feel. Treating the AI as
an junior dev made me do more testing, code review, and user experience.

AI Chat link: https://claude.ai/share/14da3456-7d21-450e-94de-aae19c7e8b92