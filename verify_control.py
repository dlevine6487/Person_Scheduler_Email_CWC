from playwright.sync_api import sync_playwright
import os

def run_verification():
    # Ensure verification directory exists
    os.makedirs("verification", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the index.html file
        # Assuming the script is run from the root, the path should be correct.
        # If not, we might need to adjust the path.
        cwd = os.getcwd()
        file_path = f"file://{cwd}/{{E732E129-2A14-4F1B-9319-FBA8D44E2B60}}/TargetedEmailSelector/control/index.html"
        print(f"Loading: {file_path}")

        page.goto(file_path)

        # Wait for the page to load and UI to update
        page.wait_for_timeout(3000)

        # Take a screenshot of the initial state (Auto mode)
        page.screenshot(path="verification/initial_auto_mode.png")
        print("Screenshot saved: verification/initial_auto_mode.png")

        # Click on "Manual" mode
        page.click("#mode-manual")
        page.wait_for_timeout(1000)

        # Debug: list all cards text
        cards = page.locator(".premium-card")
        count = cards.count()
        print(f"Found {count} cards")

        # Try to find Sarah Jenkins again
        sarah_card = page.locator(".premium-card").filter(has_text="Sarah Jenkins")
        if sarah_card.count() > 0:
            sarah_card.first.click() # Ensure we click the first match if multiple
            page.wait_for_timeout(1000)

            # Take a screenshot of the manual selection
            page.screenshot(path="verification/manual_selection_sarah.png")
            print("Screenshot saved: verification/manual_selection_sarah.png")
        else:
             print("Could not find Sarah Jenkins card")
             page.screenshot(path="verification/failed_selection.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
