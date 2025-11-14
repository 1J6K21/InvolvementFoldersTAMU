# Python argparse Guide

A comprehensive guide to building command-line interfaces with Python's argparse module.

## Basic Concepts

argparse is Python's standard library for creating user-friendly command-line interfaces. It automatically generates help messages, handles errors, and parses command-line arguments.

## Simple Example

```python
import argparse

parser = argparse.ArgumentParser(description='My CLI tool')
parser.add_argument('name', help='Your name')
parser.add_argument('--age', type=int, help='Your age')

args = parser.parse_args()
print(f"Hello {args.name}, age {args.age}")
```

Usage:
```bash
python script.py John --age 25
# Output: Hello John, age 25
```

## Argument Types

### Positional Arguments
Required arguments that must be provided in order:

```python
parser.add_argument('input_file', help='Input file path')
parser.add_argument('output_file', help='Output file path')
```

### Optional Arguments
Start with `-` or `--`, can be provided in any order:

```python
parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
parser.add_argument('--config', default='config.json', help='Config file')
```

### Argument Properties

**type**: Convert argument to specific type
```python
parser.add_argument('--count', type=int)
parser.add_argument('--ratio', type=float)
parser.add_argument('--file', type=argparse.FileType('r'))
```

**default**: Value if argument not provided
```python
parser.add_argument('--port', type=int, default=8080)
```

**required**: Make optional argument required
```python
parser.add_argument('--api-key', required=True)
```

**choices**: Limit to specific values
```python
parser.add_argument('--env', choices=['dev', 'staging', 'prod'])
```

**nargs**: Number of arguments to consume
```python
parser.add_argument('files', nargs='+')  # One or more
parser.add_argument('--coords', nargs=2, type=float)  # Exactly 2
parser.add_argument('--tags', nargs='*')  # Zero or more
parser.add_argument('--optional', nargs='?')  # Zero or one
```

**action**: Special behaviors
```python
# Store true/false
parser.add_argument('--verbose', action='store_true')
parser.add_argument('--no-cache', action='store_false')

# Count occurrences (-vvv = 3)
parser.add_argument('-v', action='count', default=0)

# Append to list
parser.add_argument('--tag', action='append')

# Store constant value
parser.add_argument('--debug', action='store_const', const=True)
```

**metavar**: Name in help messages
```python
parser.add_argument('--input', metavar='FILE', help='Input FILE to process')
# Shows: --input FILE    Input FILE to process
```

**dest**: Variable name in args
```python
parser.add_argument('--input-file', dest='input_file')
# Access as: args.input_file
```

## Subcommands (Like Git)

Create commands like `git commit`, `git push`:

```python
parser = argparse.ArgumentParser()
subparsers = parser.add_subparsers(dest='command', help='Available commands')

# Add subcommand
commit_parser = subparsers.add_parser('commit', help='Commit changes')
commit_parser.add_argument('-m', '--message', required=True)
commit_parser.set_defaults(func=do_commit)

push_parser = subparsers.add_parser('push', help='Push changes')
push_parser.add_argument('--force', action='store_true')
push_parser.set_defaults(func=do_push)

args = parser.parse_args()
if hasattr(args, 'func'):
    args.func(args)
```

Usage:
```bash
python git.py commit -m "Initial commit"
python git.py push --force
```

## Mutually Exclusive Groups

Only one argument from group can be used:

```python
group = parser.add_mutually_exclusive_group()
group.add_argument('--json', action='store_true')
group.add_argument('--xml', action='store_true')
group.add_argument('--yaml', action='store_true')
```

## Argument Groups (Organize Help)

```python
parser = argparse.ArgumentParser()

input_group = parser.add_argument_group('input options')
input_group.add_argument('--input', help='Input file')
input_group.add_argument('--format', choices=['json', 'csv'])

output_group = parser.add_argument_group('output options')
output_group.add_argument('--output', help='Output file')
output_group.add_argument('--compress', action='store_true')
```

## Custom Types and Validation

```python
def port_number(value):
    ivalue = int(value)
    if ivalue < 1 or ivalue > 65535:
        raise argparse.ArgumentTypeError(f"{value} is not a valid port")
    return ivalue

parser.add_argument('--port', type=port_number)
```

```python
def existing_file(path):
    if not os.path.exists(path):
        raise argparse.ArgumentTypeError(f"File {path} does not exist")
    return path

parser.add_argument('input', type=existing_file)
```

## Advanced Features

### Parent Parsers (Reuse Arguments)

```python
# Common arguments
parent_parser = argparse.ArgumentParser(add_help=False)
parent_parser.add_argument('--verbose', action='store_true')
parent_parser.add_argument('--config', default='config.json')

# Inherit common arguments
parser1 = argparse.ArgumentParser(parents=[parent_parser])
parser1.add_argument('--specific1')

parser2 = argparse.ArgumentParser(parents=[parent_parser])
parser2.add_argument('--specific2')
```

### Prefix Characters

```python
# Use + instead of -
parser = argparse.ArgumentParser(prefix_chars='+')
parser.add_argument('+verbose', action='store_true')
```

### From File

```python
parser = argparse.ArgumentParser(fromfile_prefix_chars='@')
# Usage: python script.py @args.txt
```

### Partial Parsing

```python
args, unknown = parser.parse_known_args()
# Useful when passing remaining args to another program
```

## Real-World Example

```python
import argparse
import sys

def cmd_create(args):
    print(f"Creating {args.name} with template {args.template}")
    if args.force:
        print("Force mode enabled")

def cmd_delete(args):
    if not args.yes:
        confirm = input(f"Delete {args.name}? (y/n): ")
        if confirm.lower() != 'y':
            print("Cancelled")
            return
    print(f"Deleting {args.name}")

def cmd_list(args):
    print(f"Listing items (limit: {args.limit})")
    if args.verbose:
        print("Verbose mode enabled")

def main():
    parser = argparse.ArgumentParser(
        description='Project management CLI',
        epilog='For more info, visit: https://example.com'
    )
    
    parser.add_argument('--version', action='version', version='1.0.0')
    
    subparsers = parser.add_subparsers(dest='command', required=True)
    
    # Create command
    create = subparsers.add_parser('create', help='Create a new item')
    create.add_argument('name', help='Item name')
    create.add_argument('-t', '--template', default='default', 
                       choices=['default', 'minimal', 'full'])
    create.add_argument('-f', '--force', action='store_true',
                       help='Overwrite if exists')
    create.set_defaults(func=cmd_create)
    
    # Delete command
    delete = subparsers.add_parser('delete', help='Delete an item')
    delete.add_argument('name', help='Item name')
    delete.add_argument('-y', '--yes', action='store_true',
                       help='Skip confirmation')
    delete.set_defaults(func=cmd_delete)
    
    # List command
    list_cmd = subparsers.add_parser('list', help='List items')
    list_cmd.add_argument('-l', '--limit', type=int, default=10,
                         help='Max items to show')
    list_cmd.add_argument('-v', '--verbose', action='store_true')
    list_cmd.set_defaults(func=cmd_list)
    
    args = parser.parse_args()
    args.func(args)

if __name__ == '__main__':
    main()
```

Usage examples:
```bash
python cli.py create myproject --template full --force
python cli.py delete myproject --yes
python cli.py list --limit 20 --verbose
python cli.py --help
python cli.py create --help
```

## Connection to MCP (Model Context Protocol)

argparse and MCP share similar concepts:

### Similarities

1. **Tool/Command Definition**: Both define available operations
   - argparse: subcommands
   - MCP: tools with names and descriptions

2. **Parameters/Arguments**: Both specify inputs
   - argparse: `add_argument()` with type, required, choices
   - MCP: JSON schema with type, required, enum

3. **Validation**: Both validate inputs
   - argparse: type checking, choices, custom validators
   - MCP: JSON schema validation

4. **Help/Documentation**: Both provide descriptions
   - argparse: help text, epilog
   - MCP: tool descriptions, parameter descriptions

### Example Comparison

**argparse:**
```python
parser.add_argument('--count', type=int, required=True, 
                   choices=[1,2,3], help='Number of items')
```

**MCP Tool Schema:**
```json
{
  "name": "process_items",
  "description": "Process items",
  "inputSchema": {
    "type": "object",
    "properties": {
      "count": {
        "type": "integer",
        "description": "Number of items",
        "enum": [1, 2, 3]
      }
    },
    "required": ["count"]
  }
}
```

Both create structured interfaces for calling functions with validated inputs!

## Tips and Best Practices

1. **Always provide help text** - Makes your CLI self-documenting
2. **Use subcommands** for complex tools - Keeps interface clean
3. **Validate early** - Use custom types to catch errors before processing
4. **Provide defaults** - Make common use cases easy
5. **Use action='store_true'** for flags - Cleaner than requiring values
6. **Group related arguments** - Improves help readability
7. **Add examples in epilog** - Show users how to use your tool
8. **Use dest for multi-word options** - `--input-file` → `args.input_file`

## Common Patterns

### Config file + CLI args
```python
parser.add_argument('--config', type=argparse.FileType('r'))
args = parser.parse_args()

if args.config:
    config = json.load(args.config)
    # Merge config with args
```

### Verbose levels
```python
parser.add_argument('-v', '--verbose', action='count', default=0)
# -v = 1, -vv = 2, -vvv = 3
```

### Dry run mode
```python
parser.add_argument('--dry-run', action='store_true',
                   help='Show what would be done without doing it')
```

### Interactive mode
```python
if not args.yes:
    response = input("Continue? (y/n): ")
    if response.lower() != 'y':
        sys.exit(0)
```
