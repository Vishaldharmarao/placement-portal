def norm(values):
    if not values:
        return set()

    return {
        str(x).strip().lower().replace("nodejs", "node.js")
        for x in values
        if x
    }


def safe_float(value, default=0.0):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value):
    try:
        if value is None or value == "":
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def match_job(student, job):
    # -----------------------------
    # Skills
    # -----------------------------
    current = norm(student.get("skills", []))
    required = norm(job.get("required_skills", []))

    matched = sorted(current & required)
    missing = sorted(required - current)

    skill_score = (
        100
        if not required
        else round(100 * len(matched) / len(required))
    )

    # -----------------------------
    # CGPA
    # -----------------------------
    student_cgpa = safe_float(
        student.get("cgpa"),
        0
    )

    minimum_cgpa = safe_float(
        job.get("minimum_cgpa"),
        0
    )

    cgpa_ok = student_cgpa >= minimum_cgpa

    # -----------------------------
    # Branch
    # -----------------------------
    branches = norm(
        job.get("eligible_branches", [])
    )

    student_branch = (
        str(student.get("branch") or "")
        .strip()
        .lower()
    )

    branch_ok = (
        not branches
        or student_branch in branches
    )

    # -----------------------------
    # Graduation year
    # -----------------------------
    student_year = safe_int(
        student.get("graduation_year")
    )

    job_year = safe_int(
        job.get("graduation_year")
    )

    # If the job does not specify a graduation year,
    # do not reject the student.
    #
    # If the student's graduation year is missing,
    # also do not crash. Treat it as unknown.
    if job_year is None:
        year_ok = True
    elif student_year is None:
        year_ok = True
    else:
        year_ok = student_year == job_year

    # -----------------------------
    # Overall score
    # -----------------------------
    overall = round(
        skill_score * 0.70
        + (100 if cgpa_ok else 0) * 0.15
        + (100 if branch_ok else 0) * 0.10
        + (100 if year_ok else 0) * 0.05
    )

    return {
        "match_percentage": overall,
        "skill_match_percentage": skill_score,
        "matching_skills": matched,
        "missing_skills": missing,
        "eligibility": {
            "cgpa": cgpa_ok,
            "branch": branch_ok,
            "graduation_year": year_ok
        },
        "reason": (
            f"{len(matched)} of "
            f"{len(required)} required skills "
            f"match your profile."
        )
    }


def skill_gap(current_skills, required_skills, role):
    current = norm(current_skills)
    required = norm(required_skills)

    missing = sorted(required - current)

    recommendations = [
        f"Build one focused project using {skill.title()}."
        for skill in missing[:3]
    ]

    recommendations.append(
        f"Practice interview questions for {role}."
    )

    return {
        "role": role,
        "current_skills": sorted(current),
        "required_skills": sorted(required),
        "missing_skills": missing,
        "recommendations": recommendations
    }


def interview_recommendations(role, skills, missing):
    current = norm(skills)

    baseline = [
        "Data Structures",
        "Projects",
        "Communication"
    ]

    role_focus = (
        ["SQL"]
        if any(
            word in role.lower()
            for word in ["analyst", "data"]
        )
        else ["System Design"]
    )

    focus = list(
        dict.fromkeys(
            missing
            + [
                item
                for item in role_focus + baseline
                if item.lower() not in current
            ]
        )
    )[:5]

    return {
        "role": role,
        "focus_areas": focus,
        "questions": [
            {
                "category": item,
                "difficulty": "MEDIUM",
                "question": (
                    f"Explain how you used {item} "
                    f"in a project related to {role}."
                ),
                "key_concepts": [
                    item,
                    "trade-offs",
                    "impact"
                ]
            }
            for item in focus
        ]
    }