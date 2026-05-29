import subprocess

def run():
    try:
        # Run git diff for the file reportes_service.py
        result = subprocess.run(
            ["git", "diff", "HEAD~1", "HEAD", "--", "app/services/comercial/reportes_service.py"],
            capture_output=True,
            text=True,
            cwd="C:/sgi-corban/sgi-backend"
        )
        print("STDOUT:")
        print(result.stdout)
        print("STDERR:")
        print(result.stderr)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    run()
