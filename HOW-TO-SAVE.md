# How to Save Your Work - Beginner's Guide

## 🎯 Quick Summary
Your files auto-save in Cursor, but to save **versions** of your project (snapshots you can return to), use Git!

## 💾 Saving Changes with Git (3 Simple Steps)

### When to do this:
After you make changes and want to create a "checkpoint" of your work

### The Commands:

1. **See what you changed:**
   ```bash
   git status
   ```

2. **Stage your changes (mark them to be saved):**
   ```bash
   git add .
   ```

3. **Save the version with a message:**
   ```bash
   git commit -m "Your message here describing what you changed"
   ```

4. **Backup to GitHub (optional):**
   ```bash
   git push
   ```

## 📋 Example Workflow

Let's say you changed the background color:

```bash
# Step 1: Check what changed
git status

# Step 2: Stage everything
git add .

# Step 3: Save with a descriptive message
git commit -m "Changed background color to soft pink"

# Step 4: Push to GitHub for online backup
git push
```

## 🆘 Common Scenarios

### "I messed up, how do I go back?"
```bash
# See your previous versions
git log

# Go back to a previous version (if needed)
# Ask your AI assistant for help with this!
```

### "I want to see what I changed before committing"
```bash
git diff
```

### "I want to see my commit history"
```bash
git log --oneline
```

## 💡 Tips

1. **Commit often!** Every time you complete a small task, save it.
2. **Write clear messages** - Future you will thank you!
3. **Push regularly** - This backs up your work to GitHub
4. **Don't worry about making mistakes** - Git makes it easy to undo things!

## 🚀 Running Your Project

To start the development server:
```bash
npm run dev
```

Then open: http://localhost:8080/

## 📍 Project Location
`C:\Users\eugen\DIGITAL-MARKETING-AGENCY-AI-PLUS`

---
**Need help?** Just ask! Git can seem scary at first, but you'll get the hang of it quickly. 😊
