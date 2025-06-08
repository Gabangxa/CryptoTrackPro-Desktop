# Contributing to Cryptocurrency Portfolio Management Application

Thank you for your interest in contributing to this project! This guide will help you get started with contributing code, reporting issues, and improving the application.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Project Structure](#project-structure)
- [Testing Guidelines](#testing-guidelines)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Git
- A code editor with TypeScript support (VS Code recommended)

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/crypto-portfolio-app.git
   cd crypto-portfolio-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Commit Message Format

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(api): add Bybit exchange integration
fix(auth): resolve KuCoin passphrase validation
docs(readme): update API setup instructions
```

## Coding Standards

### TypeScript Guidelines

- **Strict typing**: Always use proper TypeScript types
- **No `any` types**: Use specific types or `unknown` with type guards
- **Interface over type**: Prefer interfaces for object shapes
- **Consistent naming**: Use PascalCase for types/interfaces, camelCase for variables/functions

```typescript
// Good
interface ExchangeConfig {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}

// Avoid
type ExchangeConfig = {
  apiKey: any;
  apiSecret: any;
  passphrase: any;
}
```

### Code Style

- **Formatting**: Use Prettier for consistent formatting
- **Linting**: Follow ESLint rules
- **Imports**: Use absolute imports with `@/` prefix for client code
- **Error handling**: Always handle errors with proper logging

```typescript
// Good
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('API call failed:', error);
  throw new Error('Failed to fetch data');
}

// Avoid
const result = await apiCall(); // No error handling
```

### React Components

- **Functional components**: Use function components with hooks
- **TypeScript props**: Always type component props
- **Consistent structure**: Props, hooks, handlers, render
- **Proper cleanup**: Use cleanup functions in useEffect

```typescript
interface ComponentProps {
  data: ExchangeData[];
  onUpdate: (id: number) => void;
}

export function ExchangeComponent({ data, onUpdate }: ComponentProps) {
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, []);

  const handleClick = (id: number) => {
    onUpdate(id);
  };

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### API Design

- **RESTful endpoints**: Follow REST conventions
- **Consistent responses**: Use standard response formats
- **Error handling**: Return appropriate HTTP status codes
- **Input validation**: Validate all inputs with Zod schemas

```typescript
// Good
app.get('/api/exchanges/:id/balances', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid exchange ID' });
    }
    
    const balances = await getExchangeBalances(id);
    res.json(balances);
  } catch (error) {
    console.error('Failed to fetch balances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Pull Request Process

### Before Submitting

1. **Update your branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run tests and checks**
   ```bash
   npm run test
   npm run lint
   npm run type-check
   npm run build
   ```

3. **Update documentation** if needed

### PR Requirements

- **Clear title**: Describe what the PR does
- **Detailed description**: Explain the changes and reasoning
- **Link issues**: Reference related issues with `Fixes #123`
- **Screenshots**: Include UI changes screenshots
- **Test coverage**: Add tests for new functionality

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## Issue Reporting

### Bug Reports

Include:
- **Environment**: OS, Node.js version, browser
- **Steps to reproduce**: Clear step-by-step instructions
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots/logs**: Visual evidence or error logs
- **Exchange context**: Which exchange APIs are involved

### Feature Requests

Include:
- **Use case**: Why is this feature needed
- **Proposed solution**: How should it work
- **Alternatives**: Other approaches considered
- **Exchange impact**: How it affects exchange integrations

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and API client
│   │   └── types/         # TypeScript type definitions
├── server/                # Express backend
│   ├── exchanges/         # Exchange API integrations
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   └── utils/             # Server utilities
├── shared/                # Shared code between client/server
│   ├── types/             # Shared TypeScript types
│   └── schemas/           # Zod validation schemas
├── tests/                 # Test files
└── docs/                  # Additional documentation
```

## Testing Guidelines

### Unit Tests
- Test individual functions and components
- Mock external dependencies
- Use descriptive test names
- Test both success and error cases

### Integration Tests
- Test API endpoints end-to-end
- Test exchange API integrations
- Use test databases/mock APIs

### Frontend Tests
- Test component rendering
- Test user interactions
- Test data fetching and state management

```typescript
// Example component test
describe('ExchangeStatus', () => {
  it('should display connected status for active exchange', () => {
    const mockExchange = { id: 1, name: 'binance', isConnected: true };
    render(<ExchangeStatus exchange={mockExchange} />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should display error state for failed connection', () => {
    const mockExchange = { id: 1, name: 'binance', isConnected: false };
    render(<ExchangeStatus exchange={mockExchange} />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });
});
```

## Exchange Integration Guidelines

When adding new exchange support:

1. **API Documentation**: Study the exchange's API documentation thoroughly
2. **Authentication**: Implement proper API key and signature handling
3. **Rate Limiting**: Respect exchange rate limits
4. **Error Handling**: Handle exchange-specific error codes
5. **Data Normalization**: Convert exchange data to standard format
6. **Testing**: Test with sandbox/testnet environments first

## Code Review Guidelines

### For Reviewers

- **Be constructive**: Provide helpful feedback
- **Check functionality**: Ensure changes work as intended
- **Review security**: Look for API key handling and validation
- **Performance impact**: Consider effects on application performance
- **Documentation**: Verify documentation is updated

### For Authors

- **Respond promptly**: Address review comments quickly
- **Explain decisions**: Justify complex changes
- **Update based on feedback**: Make requested improvements
- **Test changes**: Verify fixes work before re-requesting review

## Getting Help

- **Documentation**: Check README.md and existing docs
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub discussions for questions
- **Discord/Slack**: Join community channels if available

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes for significant contributions
- Project documentation

Thank you for contributing to making this cryptocurrency portfolio management application better for everyone!