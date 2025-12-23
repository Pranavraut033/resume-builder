# Third-Party Licenses

This project incorporates code and concepts from the following open-source projects:

## Resumify

**Repository**: https://github.com/Afif718/Resumify  
**Author**: M. H. A. Afif  
**License**: MIT License  
**Used in**: Resume template system, PDF export functionality, color customization

### MIT License

```
MIT License

Copyright (c) 2025 M. H. A. Afif

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Attribution

We have adapted the following components from Resumify:

- **Resume Templates**: 6 professional resume templates (Tech Sidebar, Business Professional, Modern Minimal, Elegant Timeline, Creative Modern, BJet Professional) have been adapted to work with our ResumeJSON data structure and local-first architecture
- **Template System**: Template selection and preview functionality
- **Color Customization**: Resume color theming system
- **PDF Export**: Enhanced PDF generation using @react-pdf/renderer

All adapted code has been modified to:
- Work with our Next.js + Tauri architecture
- Use Prisma ORM and SQLite for data persistence
- Follow our Server Actions pattern instead of REST APIs
- Integrate with our existing ResumeJSON type system
- Comply with our project's code style and conventions

We are grateful to M. H. A. Afif for creating Resumify and making it available under the MIT License, which allows us to build upon their excellent work while maintaining our local-first, privacy-focused approach.
