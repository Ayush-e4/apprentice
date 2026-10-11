"""Customer questions for the support demo: clusters of paraphrases of the same need.

Real support traffic repeats. Each cluster below is one need asked five ways
(including Hinglish), so after the teacher answers the first, the student can
answer the rest from memory.
"""

CLUSTERS: dict[str, list[str]] = {
    "late order": [
        "My order is late, where is it?",
        "It's been an hour and my food still hasn't arrived",
        "Why is my order taking so long to arrive?",
        "mera order abhi tak nahi aaya, kab aayega?",
        "My order is delayed way past the estimated time, what's going on?",
    ],
    "missing item": [
        "An item is missing from my order, can I get a refund?",
        "My order came without the drinks I paid for",
        "One item was missing from my delivery, how do I get my money back?",
        "order mein ek item missing hai, refund milega?",
        "I didn't receive everything I ordered, part of my order is missing",
    ],
    "cancel": [
        "How do I cancel my order?",
        "Can I cancel an order after the restaurant has accepted it?",
        "I want to cancel my order, will I be charged?",
        "order cancel kaise karu?",
        "Is there a cancellation fee if I cancel my order?",
    ],
    "refund time": [
        "How long does a refund take?",
        "When will I get my refund back to my card?",
        "My refund hasn't come yet, how many days does it take?",
        "refund kitne din mein aayega?",
        "How many days for the refund to reach my UPI account?",
    ],
    "payment": [
        "Do you accept cash on delivery?",
        "Can I pay with cash when the order arrives?",
        "What payment methods can I use, is cash on delivery available?",
        "kya cash on delivery available hai?",
        "Is COD available or do I have to pay online?",
    ],
    "delivery partner": [
        "How can I contact my delivery partner?",
        "How do I call the delivery partner for my order?",
        "I need to talk to my delivery partner, how do I reach him?",
        "delivery partner ko call kaise karu?",
        "Can I message or call the delivery person bringing my order?",
    ],
}

# Questions shown as clickable chips on the page: one per cluster plus a few one-offs.
EXAMPLES: list[str] = [
    "My order is late, where is it?",
    "An item is missing from my order, can I get a refund?",
    "How do I cancel my order?",
    "How long does a refund take?",
    "Do you accept cash on delivery?",
    "How can I contact my delivery partner?",
    "I have a peanut allergy, can the restaurant make my food without peanuts?",
    "I can't log in, the OTP never arrives",
    "How do I apply a coupon code?",
]


def simulation() -> list[str]:
    """Round-robin over the clusters: the first pass reaches the teacher, later passes hit memory."""
    rounds = zip(*CLUSTERS.values())
    return [q for batch in rounds for q in batch]
